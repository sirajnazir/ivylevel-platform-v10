// Mock authentication service for demo purposes
// In production, this would use actual Firebase Auth

class MockAuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    
    // Test accounts
    this.accounts = {
      'admin@ivylevel.com': { 
        password: 'Admin123!', 
        uid: 'admin-uid',
        displayName: 'Admin User',
        role: 'admin'
      },
      'coach1@ivylevel.com': { 
        password: 'Coach123!', 
        uid: 'coach1-uid',
        displayName: 'Sarah Johnson',
        role: 'coach',
        student: 'Emma Chen'
      },
      'coach2@ivylevel.com': { 
        password: 'Coach123!', 
        uid: 'coach2-uid',
        displayName: 'Michael Roberts',
        role: 'coach',
        student: 'Alex Kumar'
      }
    };

    // Check for saved session
    const savedUser = localStorage.getItem('mockAuthUser');
    if (savedUser) {
      this.currentUser = JSON.parse(savedUser);
      this.notifyListeners();
    }
  }

  async signIn(email, password) {
    const account = this.accounts[email];
    
    if (!account || account.password !== password) {
      throw new Error('Invalid email or password');
    }

    this.currentUser = {
      uid: account.uid,
      email: email,
      displayName: account.displayName,
      role: account.role,
      student: account.student
    };

    // Save to localStorage
    localStorage.setItem('mockAuthUser', JSON.stringify(this.currentUser));
    
    this.notifyListeners();
    return this.currentUser;
  }

  async signOut() {
    const uid = this.currentUser?.uid;
    this.currentUser = null;
    localStorage.removeItem('mockAuthUser');
    if (uid) {
      localStorage.removeItem('coach_progress_' + uid);
    }
    this.notifyListeners();
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.currentUser);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  notifyListeners() {
    this.listeners.forEach(callback => callback(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Create singleton instance
const mockAuth = new MockAuthService();

// Firebase Auth compatible functions
export const signInWithEmailAndPassword = async (auth, email, password) => {
  return mockAuth.signIn(email, password);
};

export const signOut = async (auth) => {
  return mockAuth.signOut();
};

export const onAuthStateChanged = (auth, callback) => {
  return mockAuth.onAuthStateChanged(callback);
};

export default mockAuth;