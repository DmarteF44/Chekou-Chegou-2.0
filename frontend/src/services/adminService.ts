// adminService — aggregated queries for the admin panel.
import { authService, User } from "./authService";
import { driverService } from "./driverService";
import { orderService } from "./orderService";

export const adminService = {
  async stats() {
    const users = await authService.getAllUsers();
    const orders = await orderService.list();
    const pendingDrivers = users.filter((u) => u.driverStatus === "pending");
    return {
      totalUsers: users.length,
      totalDrivers: users.filter((u) => u.role === "driver").length,
      pendingDrivers: pendingDrivers.length,
      ordersInProgress: orders.filter((o) => o.status !== "Entregue").length,
      ordersDone: orders.filter((o) => o.status === "Entregue").length,
      gmv: orders.reduce((acc, o) => acc + o.total, 0),
    };
  },

  async listUsers(filter?: { role?: User["role"]; driverStatus?: User["driverStatus"] }) {
    const users = await authService.getAllUsers();
    return users.filter((u) => {
      if (filter?.role && u.role !== filter.role) return false;
      if (filter?.driverStatus && u.driverStatus !== filter.driverStatus) return false;
      return true;
    });
  },

  approveDriver: driverService.approve,
  rejectDriver: driverService.reject,
  blockDriver: driverService.block,
  unblockDriver: driverService.unblock,
  setDriverLevel: driverService.setLevel,
};
