import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Booking from "@/pages/Booking";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminZones from "@/pages/AdminZones";
import AdminOperations from "@/pages/AdminOperations";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminDrivers from "@/pages/AdminDrivers";
import AdminDriverVerifications from "@/pages/AdminDriverVerifications";
import AdminFeedback from "@/pages/AdminFeedback";
import AdminAuditLog from "@/pages/AdminAuditLog";
import AdminSupport from "@/pages/AdminSupport";
import DriverDashboard from "@/pages/DriverDashboard";
import DriverEarnings from "@/pages/DriverEarnings";
import DriverVerification from "@/pages/DriverVerification";
import Home from "@/pages/Home";
import MyOrders from "@/pages/MyOrders";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Support from "@/pages/Support";
import TrackOrder from "@/pages/TrackOrder";
import { Route, Switch } from "wouter";
import { BrowserNotificationManager } from "./components/BrowserNotifications";
import { BookingCouponBar } from "./components/BookingCouponBar";
import { ShipmentDetailsDock } from "./components/ShipmentDetailsDock";
import { OrderStopsPanel } from "./components/OrderStopsPanel";
import { DriverStopsPanel } from "./components/DriverStopsPanel";
import { ShipmentAttachmentDock } from "./components/ShipmentAttachmentDock";
import { ShareTrackingDock } from "./components/ShareTrackingDock";
import { DriverNavigationDock } from "./components/DriverNavigationDock";
import SharedTracking from "@/pages/SharedTracking";
import NotificationsCenter from "@/pages/NotificationsCenter";
import { InstallAppPrompt } from "./components/InstallAppPrompt";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/book/person" component={Booking} />
      <Route path="/book/parcel" component={Booking} />
      <Route path="/my-orders" component={MyOrders} />
      <Route path="/profile" component={Profile} />
      <Route path="/settings" component={Profile} />
      <Route path="/support" component={Support} />
      <Route path="/track/:reference" component={TrackOrder} />
      <Route path="/shared/:token" component={SharedTracking} />
      <Route path="/notifications" component={NotificationsCenter} />
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver/verification" component={DriverVerification} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/admin/zones" component={AdminZones} />
      <Route path="/admin/operations" component={AdminOperations} />
      <Route path="/admin/verifications" component={AdminDriverVerifications} />
      <Route path="/admin/coupons" component={AdminCoupons} />
      <Route path="/admin/feedback" component={AdminFeedback} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/audit" component={AdminAuditLog} />
      <Route path="/admin/support" component={AdminSupport} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster richColors position="top-center" />
          <BrowserNotificationManager />
          <InstallAppPrompt />
          <BookingCouponBar />
          <ShipmentDetailsDock />
          <OrderStopsPanel />
          <DriverStopsPanel />
          <ShipmentAttachmentDock />
          <ShareTrackingDock />
          <DriverNavigationDock />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
