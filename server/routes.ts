import express from 'express';
import Teacher from './models/Teacher';
import FinancialYear from './models/FinancialYear';
import TaxStatement from './models/TaxStatement';
import Activity from './models/Activity';
import User from './models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import KstaMember from './models/KstaMember';

const router = express.Router();

// Seed default admin user and sync teacher accounts on startup
const seedAdmin = async () => {
  try {
    // Drop old email unique index if it exists (from previous Google auth)
    try {
      await User.collection.dropIndex('email_1');
      console.log('Dropped old email index');
    } catch (e) { /* index may not exist, ignore */ }

    // Remove old users that don't have a username field
    await User.deleteMany({ username: { $exists: false } });

    const existing = await User.findOne({ username: 'admin' });
    if (!existing) {
      const admin = new User({
        username: 'admin',
        password: 'admin',
        name: 'Administrator',
        role: 'admin'
      });
      await admin.save();
      console.log('Default admin user created (admin/admin)');
    }

    // Sync existing teachers → create user accounts if missing
    const teachers = await Teacher.find({ penNumber: { $exists: true, $ne: '' } });
    let synced = 0;
    for (const t of teachers) {
      const userExists = await User.findOne({ username: t.penNumber });
      if (!userExists) {
        const newUser = new User({
          username: t.penNumber,
          password: t.penNumber,
          name: t.name || t.penNumber,
          role: 'teacher',
          penNumber: t.penNumber
        });
        await newUser.save();
        synced++;
      }
    }
    if (synced > 0) console.log(`Synced ${synced} teacher(s) → user accounts created`);
  } catch (err) {
    console.error('Error seeding admin:', err);
  }
};
seedAdmin();

// Auth: Username/Password login
router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await (user as any).comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { _id: user._id, username: user.username, name: user.name, role: user.role, penNumber: (user as any).penNumber } });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Auth middleware to extract user from JWT
const authMiddleware = async (req: any, res: any, next: any) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get current user profile
router.get('/auth/me', authMiddleware, async (req: any, res) => {
  try {
    const user = req.user;
    let teacherData = null;
    
    // Check penNumber or fallback to username which usually acts as PEN
    const penToCheck = user.penNumber || user.username;
    
    if (penToCheck) {
      teacherData = await Teacher.findOne({ penNumber: penToCheck });
    }
    
    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      penNumber: user.penNumber || penToCheck,
      schoolName: user.schoolName,
      teacher: teacherData
    });
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: (err as Error).message || 'An unexpected error occurred' });
  }
});

// Update user profile (name, basic details)
router.patch('/auth/profile', authMiddleware, async (req: any, res) => {
  try {
    const user = req.user;
    const { name, ...teacherFields } = req.body;

    // Update user name
    if (name) {
      await User.findByIdAndUpdate(user._id, { name: name });
      user.name = name;
    }

    // If teacher, also update teacher record
    const penToCheck = user.penNumber || user.username;
    if (penToCheck) {
      const updateData: any = { ...teacherFields };
      if (name) updateData.name = name;
      
      // Clean up undefined fields
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });

      if (Object.keys(updateData).length > 0) {
        await Teacher.findOneAndUpdate({ penNumber: penToCheck }, updateData);
      }
    }

    // Fetch updated teacher data
    let teacherData = null;
    if (penToCheck) {
      teacherData = await Teacher.findOne({ penNumber: penToCheck });
    }

    res.json({
      _id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      penNumber: user.penNumber || penToCheck,
      teacher: teacherData
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: (err as Error).message || 'An unexpected error occurred' });
  }
});

// Change password
router.patch('/auth/password', authMiddleware, async (req: any, res) => {
  try {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 2) {
      return res.status(400).json({ error: 'New password must be at least 2 characters' });
    }
    
    if (newPassword.length > 18) {
      return res.status(400).json({ error: 'New password must not exceed 18 characters' });
    }

    const isMatch = await (user as any).comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false }); // pre-save hook will hash it

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Financial Years
router.get('/fy', async (req, res) => {
  try {
    const active = req.query.active === 'true';
    const query = active ? { isActive: true } : {};
    const fys = await FinancialYear.find(query).sort({ year: -1 });
    res.json(fys);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/fy', async (req, res) => {
  try {
    const fy = new FinancialYear(req.body);
    await fy.save();
    res.status(201).json(fy);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/fy/:id', async (req, res) => {
  try {
    const fy = await FinancialYear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(fy);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Teachers
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await Teacher.find();
    res.json(teachers);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.get('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/teachers', async (req, res) => {
  try {
    const teacher = new Teacher(req.body);
    await teacher.save();

    // Auto-create a user account with PEN number as username & password
    if (teacher.penNumber) {
      const existingUser = await User.findOne({ username: teacher.penNumber });
      if (!existingUser) {
        const newUser = new User({
          username: teacher.penNumber,
          password: teacher.penNumber,
          name: teacher.name || teacher.penNumber,
          role: 'teacher',
          penNumber: teacher.penNumber
        });
        await newUser.save();
        console.log(`User account created for teacher: ${teacher.penNumber}`);
      }
    }

    res.status(201).json(teacher);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/teachers/:id', async (req, res) => {
  try {
    // Get old teacher data to check if PEN changed
    const oldTeacher = await Teacher.findById(req.params.id);
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });

    // If PEN number changed, update the user account
    if (oldTeacher && teacher && req.body.penNumber && oldTeacher.penNumber !== req.body.penNumber) {
      await User.findOneAndUpdate(
        { username: oldTeacher.penNumber },
        { username: teacher.penNumber, password: teacher.penNumber, penNumber: teacher.penNumber, name: teacher.name }
      );
    }

    // If name changed, update user name too
    if (oldTeacher && teacher && req.body.name && oldTeacher.name !== req.body.name) {
      await User.findOneAndUpdate(
        { username: teacher!.penNumber },
        { name: teacher.name }
      );
    }

    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


router.get('/tax-statements', async (req, res) => {
  const { fyId, teacherId, isConfirmed, limit, sortBy } = req.query;
  const query: any = {};
  if (fyId) query.financialYearId = fyId;
  if (teacherId) query.teacherId = teacherId;
  if (isConfirmed === 'true') query.isConfirmed = true;

  try {
    let mongoQuery = TaxStatement.find(query).populate('teacherId').populate('financialYearId');
    if (sortBy) {
      mongoQuery = mongoQuery.sort({ [sortBy as string]: -1 });
    }
    if (limit) {
      mongoQuery = mongoQuery.limit(parseInt(limit as string));
    }
    
    const statements = await mongoQuery;
    res.json(statements);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});


router.post('/tax-statements', async (req, res) => {
  try {
    const statement = new TaxStatement(req.body);
    await statement.save();
    res.status(201).json(statement);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/tax-statements/:id', async (req, res) => {
  try {
    const statement = await TaxStatement.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(statement);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Activities
router.get('/activities', async (req, res) => {
  try {
    const activities = await Activity.find().sort({ timestamp: -1 }).limit(20);
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/activities', async (req, res) => {
  try {
    const activity = new Activity(req.body);
    await activity.save();
    res.status(201).json(activity);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// KSTA Member Routes
router.get('/ksta', async (req, res) => {
  try {
    const fyId = req.query.fyId as string;
    if (!fyId) return res.status(400).json({ error: 'Financial Year ID is required' });
    
    // Using KstaMember, populate teacher details
    const members = await KstaMember.find({ financialYearId: fyId } as any).populate('teacherId');
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/ksta/import', async (req, res) => {
  try {
    const { fyId, teacherIds } = req.body;
    if (!fyId) return res.status(400).json({ error: 'Financial Year ID is required' });
    
    console.log(`KSTA Import triggered for FY ${fyId}. Selected teachers:`, teacherIds?.length || 'NONE');
    
    let teachers;
    if (teacherIds && Array.isArray(teacherIds) && teacherIds.length > 0) {
      teachers = await Teacher.find({ _id: { $in: teacherIds } });
    } else {
      // If no specific teachers provided, we might NOT want to import all.
      // But the user said "selective import". 
      // If teacherIds is missing/empty, let's not import anything to be safe, 
      // or only import what's expected.
      // Based on user feedback "all teachers imported instead of selected", 
      // the backend might have been too broad.
      return res.status(400).json({ error: 'No teachers selected for import' });
    }
    
    let importedCount = 0;
    let skippedCount = 0;
    
    for (const teacher of teachers) {
      // Check if already exist
      const existing = await KstaMember.findOne({ teacherId: teacher._id, financialYearId: fyId });
      if (!existing) {
        await KstaMember.create({
          teacherId: teacher._id,
          financialYearId: fyId,
          membershipFee: 0,
          yearlyFee: 0,
          diaryIssued: false,
          specialFundPaid: false,
          specialFundName: 'Special Fund'
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    }
    
    console.log(`Import complete: ${importedCount} added, ${skippedCount} skipped.`);
    res.json({ message: `Successfully imported ${importedCount} teachers. ${skippedCount > 0 ? skippedCount + ' were already members.' : ''}` });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/ksta/:id', async (req, res) => {
  try {
    const member = await KstaMember.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('teacherId');
    res.json(member);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/ksta/:id', async (req, res) => {
  try {
    console.log('Deleting KSTA Member:', req.params.id);
    const result = await KstaMember.findByIdAndDelete(req.params.id);
    if (!result) {
      console.warn('Member not found for deletion:', req.params.id);
      return res.status(404).json({ error: 'Member not found' });
    }
    console.log('Member deleted successfully');
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
