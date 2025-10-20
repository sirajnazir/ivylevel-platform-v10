import React, { useState, useEffect } from 'react';

export const Students: React.FC = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch('/api/coach/my-students');
        const data = await response.json();
        setStudents(data.students || []);
      } catch (error) {
        console.error('Error loading students:', error);
        // Fallback data
        setStudents([
          {
            id: "student_001",
            name: "Huda",
            email: "hudasir4j@gmail.com",
            grade: 12,
            progress: 65,
            last_activity: "2025-08-15",
            next_deadline: "2025-10-05",
            status: "active"
          },
          {
            id: "student_002",
            name: "Alex",
            email: "alex@example.com",
            grade: 12,
            progress: 45,
            last_activity: "2025-08-10",
            next_deadline: "2025-09-15",
            status: "active"
          },
          {
            id: "student_003",
            name: "Sarah",
            email: "sarah@example.com",
            grade: 11,
            progress: 30,
            last_activity: "2025-08-12",
            next_deadline: "2025-12-01",
            status: "active"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Students</h1>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Student Roster</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {students.map((student) => (
                <div key={student.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">{student.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <p><strong>Email:</strong> {student.email}</p>
                    <p><strong>Grade:</strong> {student.grade}</p>
                    <p><strong>Progress:</strong> {student.progress}%</p>
                    <p><strong>Last Activity:</strong> {student.last_activity}</p>
                    <p><strong>Next Deadline:</strong> {student.next_deadline}</p>
                  </div>
                  
                  <div className="mt-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${student.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{student.progress}% complete</p>
                  </div>
                  
                  <button className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    View Details
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

