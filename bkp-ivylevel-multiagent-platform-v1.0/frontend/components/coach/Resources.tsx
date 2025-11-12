import React from 'react';

export const Resources: React.FC = () => {
  const resources = [
    {
      id: 1,
      title: "SAT Prep Guide",
      category: "Test Preparation",
      description: "Comprehensive guide for SAT preparation strategies",
      type: "PDF",
      size: "2.3 MB",
      downloads: 156
    },
    {
      id: 2,
      title: "Essay Writing Workshop",
      category: "Writing",
      description: "Video workshop on college essay writing techniques",
      type: "Video",
      size: "45.2 MB",
      downloads: 89
    },
    {
      id: 3,
      title: "College Application Timeline",
      category: "Planning",
      description: "Detailed timeline for college application process",
      type: "PDF",
      size: "1.1 MB",
      downloads: 234
    },
    {
      id: 4,
      title: "Interview Preparation",
      category: "Interview",
      description: "Tips and strategies for college interviews",
      type: "PDF",
      size: "3.7 MB",
      downloads: 67
    },
    {
      id: 5,
      title: "Financial Aid Guide",
      category: "Financial",
      description: "Complete guide to financial aid and scholarships",
      type: "PDF",
      size: "4.2 MB",
      downloads: 123
    },
    {
      id: 6,
      title: "Extracurricular Planning",
      category: "Activities",
      description: "How to plan and organize extracurricular activities",
      type: "PDF",
      size: "1.8 MB",
      downloads: 98
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Resources</h1>
        
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Available Resources</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                Upload Resource
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {resources.map((resource) => (
                <div key={resource.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      resource.type === 'PDF' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {resource.type}
                    </span>
                    <span className="text-xs text-gray-500">{resource.size}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{resource.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>{resource.category}</span>
                    <span>{resource.downloads} downloads</span>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                      Download
                    </button>
                    <button className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                      Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

