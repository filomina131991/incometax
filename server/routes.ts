import express from 'express';
import Teacher from './models/Teacher';
import FinancialYear from './models/FinancialYear';
import TaxStatement from './models/TaxStatement';
import Activity from './models/Activity';
import User from './models/User';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Auth Routes (Simplified for this migration)
router.post('/auth/login', async (req, res) => {
  const { email, name, googleId } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) {
      // Automatic signup if email is the default admin or first time login
      const isDefaultAdmin = email === 'filomina131991@gmail.com';
      user = new User({
        email,
        name,
        googleId,
        role: isDefaultAdmin ? 'admin' : 'teacher'
      });
      await user.save();
    }
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    );
    res.json({ token, user });
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
    res.status(201).json(teacher);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/teachers/:id', async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Tax Statements
router.get('/tax-statements', async (req, res) => {
  const { fyId, teacherId, isConfirmed } = req.query;
  const query: any = {};
  if (fyId) query.financialYearId = fyId;
  if (teacherId) query.teacherId = teacherId;
  if (isConfirmed === 'true') query.isConfirmed = true;

  try {
    const statements = await TaxStatement.find(query).populate('teacherId').populate('financialYearId');
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

export default router;
