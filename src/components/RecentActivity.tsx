import { useState, useEffect } from 'react';
import { dbService } from '../api';
import { Activity } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { Save, Trash2, Edit2, Plus, CheckCircle, Clock } from 'lucide-react';

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      try {
        const data = await dbService.getRecentActivities();
        setActivities(data);
      } catch (error) {
        console.error("Error fetching activities:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActivities();
    
    // Optional: could add polling here since we lost Firebase's real-time features
    const interval = setInterval(fetchActivities, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'create': return <Plus className="h-4 w-4 text-green-500" />;
      case 'update': return <Edit2 className="h-4 w-4 text-blue-500" />;
      case 'delete': return <Trash2 className="h-4 w-4 text-red-500" />;
      case 'save': return <Save className="h-4 w-4 text-purple-500" />;
      case 'confirm': return <CheckCircle className="h-4 w-4 text-indigo-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) return <div className="animate-pulse space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>;

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm italic">
        No recent activity found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-blue-100 transition-colors shadow-sm">
          <div className="mt-0.5 bg-gray-50 p-1.5 rounded-lg">
            {getIcon(activity.type)}
          </div>
          <div className="flex-grow min-w-0">
            <p className="text-sm text-gray-900 font-medium truncate">
              {activity.description}
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-[10px] text-gray-400 font-medium">
                {activity.userName}
              </span>
              <span className="text-[10px] text-gray-300">•</span>
              <span className="text-[10px] text-gray-400">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
