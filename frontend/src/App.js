import BarcodeAttendanceScanner from './pages/barcode/BarcodeAttendanceScanner';

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { authRoutes, adminRoutes, adminDashboardRoutes, teacherRoutes, studentRoutes, cashierRoutes } from './routes';

import AuthGuard from './components/AuthGuard';
import PublicRoute from './components/PublicRoute';
import LogoutSync from './components/LogoutSync';
import LogoutHandler from './components/LogoutHandler';
import { SidebarProvider } from './components/layout/SidebarContext';


import ExamDesigner from './pages/dashboard/teacherDashboard/Exam/ExamDesigner';
import MarkingView from './pages/dashboard/teacherDashboard/Exam/MarkingView';
import ResultsView from './pages/dashboard/teacherDashboard/Exam/ResultsView';
// import ExamResult from './pages/dashboard/studentDashboard/ExamResult';

function App() {
  return (
    <BrowserRouter>
      <LogoutSync />
      <Routes>
        
        
        {/* Auth Routes - Public (redirect if authenticated) */}
        {authRoutes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={<PublicRoute>{route.element}</PublicRoute>} 
          />
        ))}

        {/* Admin Dashboard Routes - Protected */}
        {adminDashboardRoutes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={
              <AuthGuard requiredRole="admin">
                <SidebarProvider>
                  <LogoutHandler>
                    {route.element}
                  </LogoutHandler>
                </SidebarProvider>
              </AuthGuard>
            }
          />
        ))}

        {/* Barcode Attendance Scanner Route - Public */}
        <Route path="/scanner" element={<BarcodeAttendanceScanner />} />

        {/* Admin Nested Routes - Protected */}
        {adminRoutes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={
              <AuthGuard requiredRole="admin">
                <SidebarProvider>
                  <LogoutHandler>
                    {route.element}
                  </LogoutHandler>
                </SidebarProvider>
              </AuthGuard>
            }
          >
            {route.children?.map((child, childIndex) => (
              <Route 
                key={childIndex} 
                path={child.path} 
                element={child.element} 
                index={child.index}
              />
            ))}
          </Route>
        ))}

        {/* Teacher Routes - Protected */}
        {teacherRoutes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={
              <AuthGuard requiredRole="teacher">
                <SidebarProvider>
                  <LogoutHandler>
                    {route.element}
                  </LogoutHandler>
                </SidebarProvider>
              </AuthGuard>
            } 
          />
        ))}

         {/* Teacher exam routes (explicit) */}
        <Route
          path="/exam/:id/design"
          element={
            <AuthGuard requiredRole="teacher">
              <SidebarProvider>
                <LogoutHandler>
                  <ExamDesigner />
                </LogoutHandler>
              </SidebarProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/exam/:id/mark"
          element={
            <AuthGuard requiredRole="teacher">
              <SidebarProvider>
                <LogoutHandler>
                  <MarkingView />
                </LogoutHandler>
              </SidebarProvider>
            </AuthGuard>
          }
        />
        <Route
          path="/exam/:id/results"
          element={
            <AuthGuard requiredRole="teacher">
              <SidebarProvider>
                <LogoutHandler>
                  <ResultsView />
                </LogoutHandler>
              </SidebarProvider>
            </AuthGuard>
          }
        />

        {/* Student exam results route
        <Route
          path="/student/exam/:id/results"
          element={
            <AuthGuard requiredRole="student">
              <SidebarProvider>
                <LogoutHandler>
                  <ExamResult />
                </LogoutHandler>
              </SidebarProvider>
            </AuthGuard>
          }
        /> */}

        {/* Student Routes - Protected with SidebarProvider */}
        {studentRoutes.map((route, index) => (
          <Route 
            key={index}
            path={route.path} 
            element={
              <AuthGuard requiredRole="student">
                <SidebarProvider>
                  <LogoutHandler>
                    {route.element}
                  </LogoutHandler>
                </SidebarProvider>
              </AuthGuard>
            } 
          />
        ))}

        {/* Cashier Routes - Protected (support nested children) */}
        {cashierRoutes.map((route, index) => (
          <Route 
            key={index} 
            path={route.path} 
            element={
              <AuthGuard requiredRole="cashier">
                <SidebarProvider>
                  <LogoutHandler>
                    {route.element}
                  </LogoutHandler>
                </SidebarProvider>
              </AuthGuard>
            } 
          >
            {route.children?.map((child, childIndex) => (
              <Route 
                key={childIndex} 
                path={child.path} 
                element={child.element} 
                index={child.index}
              />
            ))}
          </Route>
        ))}
  {/* Barcode Attendance Scanner Route - Public */}
  <Route path="/scanner" element={<BarcodeAttendanceScanner />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
