import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Brain, Target, Book, Award, ChevronRight, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const mockSkillData = [
  { subject: 'Critical Reading', score: 85 },
  { subject: 'Math Analysis', score: 75 },
  { subject: 'Writing Skills', score: 90 },
  { subject: 'Problem Solving', score: 80 },
  { subject: 'Time Management', score: 70 },
];

const mockProgressData = [
  { week: 'Week 1', score: 1200 },
  { week: 'Week 2', score: 1250 },
  { week: 'Week 3', score: 1280 },
  { week: 'Week 4', score: 1310 },
  { week: 'Week 5', score: 1350 },
  { week: 'Week 6', score: 1400 },
];

export function ProgressTracker() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Progress Tracker</h1>
            <p className="text-gray-600">Your journey to college readiness</p>
          </div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="bg-indigo-600 text-white px-6 py-3 rounded-lg cursor-pointer flex items-center gap-2"
          >
            <Award className="w-5 h-5" />
            <span>View Achievements</span>
          </motion.div>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>SAT Score Progress</CardTitle>
              <CardDescription>Weekly performance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mockProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[1100, 1600]} />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#4F46E5"
                      strokeWidth={2}
                      dot={{ fill: '#4F46E5' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Skill Assessment</CardTitle>
              <CardDescription>Your current proficiency levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={mockSkillData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Skills" 
                      dataKey="score" 
                      stroke="#4F46E5" 
                      fill="#4F46E5" 
                      fillOpacity={0.2} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Learning Paths */}
        <Card>
          <CardHeader>
            <CardTitle>Recommended Learning Paths</CardTitle>
            <CardDescription>Personalized study recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: Brain,
                  title: 'Critical Thinking',
                  description: 'Enhance analytical and reasoning skills',
                  progress: 65,
                },
                {
                  icon: Book,
                  title: 'Reading Comprehension',
                  description: 'Improve understanding and analysis',
                  progress: 80,
                },
                {
                  icon: Target,
                  title: 'Math Mastery',
                  description: 'Advanced problem-solving techniques',
                  progress: 45,
                },
              ].map((path, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group cursor-pointer"
                >
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 transition-all duration-200 group-hover:shadow-md">
                    <div className="flex items-center justify-between mb-4">
                      <div className="bg-indigo-100 p-3 rounded-lg">
                        <path.icon className="w-6 h-6 text-indigo-600" />
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">{path.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{path.description}</p>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div className="text-xs font-semibold inline-block text-indigo-600">
                          Progress
                        </div>
                        <div className="text-xs font-semibold inline-block text-indigo-600">
                          {path.progress}%
                        </div>
                      </div>
                      <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${path.progress}%` }}
                          transition={{ duration: 1, delay: index * 0.2 }}
                          className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-600"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}