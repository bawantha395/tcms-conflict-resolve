import StudentDashboard from '../../pages/dashboard/studentDashboard/StudentDashboard';
import MyProfile from '../../pages/dashboard/studentDashboard/MyProfile';
import PurchaseClasses from '../../pages/dashboard/studentDashboard/PurchaseClasses';
import MyClasses from '../../pages/dashboard/studentDashboard/MyClasses';
import MyClassDetail from '../../pages/dashboard/studentDashboard/MyClassDetail';
import Checkout from '../../pages/dashboard/studentDashboard/Checkout';
import Invoice from '../../pages/dashboard/studentDashboard/Invoice';
import PaymentSuccess from '../../pages/dashboard/studentDashboard/PaymentSuccess';
import PaymentCancel from '../../pages/dashboard/studentDashboard/PaymentCancel';
import Receipt from '../../pages/dashboard/studentDashboard/Receipt';

import MyPayments from '../../pages/dashboard/studentDashboard/MyPayments';

import PurchaseStudyPack from '../../pages/dashboard/studentDashboard/PurchaseStudyPack';
import PurchaseStudyPackOne from '../../pages/dashboard/studentDashboard/StudyPack/PurchaseStudyPack_1';
import MyStudyPacks from '../../pages/dashboard/studentDashboard/StudyPack/MyStudyPacks';
import StudyPackCheckOut from '../../pages/dashboard/studentDashboard/StudyPack/StudyPackCheckOut';
import StudyPackDetail from '../../pages/dashboard/studentDashboard/StudyPack/StudyPackDetail';
import StudyPackPaymentSuccess from '../../pages/dashboard/studentDashboard/StudyPack/StudyPackPaymentSuccess';
import StudyPackInvoice from '../../pages/dashboard/studentDashboard/StudyPack/StudyPackInvoice';
import StudentStudyPackPaymentCancel from '../../pages/dashboard/studentDashboard/StudyPack/StudentStudyPackPaymentCancel';
import LiveClasses from '../../pages/dashboard/studentDashboard/LiveClasses';
import ExamResult from '../../pages/dashboard/studentDashboard/ExamResult';
import MyStudyPackPayments from '../../pages/dashboard/studentDashboard/StudyPack/MyStudyPackPayments';


export const studentRoutes = [
  { path: "/studentdashboard", element: <StudentDashboard/> },
  { path: "/student/profile", element: <MyProfile/> },
  { path: "/student/purchase-classes", element: <PurchaseClasses/> },
  { path: "/student/my-classes", element: <MyClasses/> },
  { path: "/student/my-classes/:id", element: <MyClassDetail/> },
  { path: "/student/checkout/:id", element: <Checkout/> },
  { path: "/student/invoice", element: <Invoice/> },
  { path: "/student/payment-success", element: <PaymentSuccess/> },
  { path: "/student/studypack-payment-success", element: <StudyPackPaymentSuccess/> },
  { path: "/student/payment-cancel", element: <PaymentCancel/> },
  { path: "/student/receipt", element: <Receipt /> },

  { path: "/student/my-payments", element: <MyPayments/> },
  { path: "/student/my-study-pack-payments", element: <MyStudyPackPayments/> },

  { path: "/student/purchasestudypack", element: <PurchaseStudyPack /> },
  { path: "/student/purchasestudypack01", element: <PurchaseStudyPackOne /> },
  { path: "/student/studypacks", element: <MyStudyPacks /> },
  { path: "/student/studypacks/:id", element: <StudyPackDetail /> },
  { path: "/student/studypack/checkout/:id", element: <StudyPackCheckOut /> },
  { path: "/student/studypack/invoice", element: <StudyPackInvoice /> },
  { path: "/student/studypack-payment-cancel", element: <StudentStudyPackPaymentCancel /> },
  { path: "/student/liveclasses", element: <LiveClasses /> },
  { path: "/student/exam/results", element: <ExamResult /> },

];