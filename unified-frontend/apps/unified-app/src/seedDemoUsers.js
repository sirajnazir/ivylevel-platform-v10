// Seed demo users for testing
const demoUsers = [
  {
    id: '1',
    email: 'hudasir4j@gmail.com',
    name: 'Huda',
    role: 'student',
    password: 'password123'
  },
  {
    id: '2',
    email: 'jennyduan@ivymentors.co',
    name: 'Jenny',
    role: 'coach',
    password: 'password123'
  }
];

// Function to seed demo users
export function seedDemoUsers() {
  const existingUsers = JSON.parse(localStorage.getItem('registeredUsers') || '[]');
  
  // Check if demo users already exist
  const hudaExists = existingUsers.some(u => u.email === 'hudasir4j@gmail.com');
  const jennyExists = existingUsers.some(u => u.email === 'jennyduan@ivymentors.co');
  
  if (!hudaExists || !jennyExists) {
    // Add demo users if they don't exist
    const updatedUsers = [...existingUsers];
    
    if (!hudaExists) {
      updatedUsers.push(demoUsers[0]);
    }
    
    if (!jennyExists) {
      updatedUsers.push(demoUsers[1]);
    }
    
    localStorage.setItem('registeredUsers', JSON.stringify(updatedUsers));
    console.log('Demo users seeded successfully');
  } else {
    console.log('Demo users already exist');
  }
}