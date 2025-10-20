// Mock Authentication Service
// Used by some coach components for demo purposes

export const signInWithEmailAndPassword = async (email, password) => {
  // Mock implementation
  if (email === 'coach@test.com' && password === 'test123') {
    return {
      user: {
        uid: 'coach-123',
        email: 'coach@test.com',
        displayName: 'Test Coach'
      }
    };
  }
  throw new Error('Invalid credentials');
};

export const onAuthStateChanged = (callback) => {
  // Mock implementation - immediately call with null (not logged in)
  setTimeout(() => callback(null), 100);
  
  // Return unsubscribe function
  return () => {};
};

export const signOut = async () => {
  // Mock implementation
  return Promise.resolve();
};