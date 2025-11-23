import LoginPage from '../../pages/loginPage/LoginPage';
import NewStudentRegister from '../../pages/registerPage/NewStudentRegister';
import ForgotPassword from '../../pages/loginPage/ForgotPassword';

export const authRoutes = [
  { path: "/login", element: <LoginPage/> },
  { path: "/forgotpassword", element: <ForgotPassword/> },
  { path: "/register", element: <NewStudentRegister/> },
]; 