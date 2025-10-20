import { createContext } from 'react';

interface AuthContextType {
  user: any;
  setUser: (user: any) => void;
  userRole: 'student' | 'coach' | 'admin' | null;
  setUserRole: (role: 'student' | 'coach' | 'admin' | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  userRole: null,
  setUserRole: () => {},
});

export default AuthContext;