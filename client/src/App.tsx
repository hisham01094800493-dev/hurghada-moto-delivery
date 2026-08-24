import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Booking from "@/pages/Booking";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminCoupons from "@/pages/AdminCoupons";
import AdminDrivers from "@/pages/AdminDrivers";
import AdminFeedback from "@/pages/AdminFeedback";
import AdminAuditLog from "@/pages/AdminAuditLog";
import AdminSupport from "@/pages/AdminSupport";
import DriverDashboard from "@/pages/DriverDashboard";
import DriverEarnings from "@/pages/DriverEarnings";
import Home from "@/pages/Home";
import MyOrders from "@/pages/MyOrders";
import NotFound from "@/pages/NotFound";
import Profile from "@/pages/Profile";
import Support from "@/pages/Support";
import TrackOrder from "@/pages/TrackOrder";
import { Route, Switch } from "wouter";
import { BrowserNotificationManager } from "./components/BrowserNotifications";
import { BookingCouponBar } from "./components/BookingCouponBar";
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
      <Route path="/driver/earnings" component={DriverEarnings} />
      <Route path="/driver" component={DriverDashboard} />
      <Route path="/admin/drivers" component={AdminDrivers} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
