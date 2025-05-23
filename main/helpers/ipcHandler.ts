import { ipcMain } from "electron";
import db from "./database";
import axios from "axios";
import dns from "dns";
import {
  clearEmployeeCookie,
  getEmployeeCookie,
  setEmployeeCookie,
} from "./cookieHandler";

require("dotenv").config();

const apiUrl = process.env.API_URL;
console.log("API URL:", apiUrl);

export default function ipcHandler() {
  // check online
  function checkInternet(): Promise<boolean> {
    return new Promise((resolve) => {
      dns.lookup("google.com", (err) => {
        resolve(!err);
      });
    });
  }

  // get cookie
  ipcMain.handle("getEmployeeData", async () => {
    const employee = await getEmployeeCookie();
    return employee
      ? { success: true, data: employee }
      : { success: false, message: "No employee cookie found" };
  });

  // fetch store
  ipcMain.handle("getStores", async (_event, organizationId) => {
    console.log(
      "Received request to get stores for organizationId:",
      organizationId
    );

    try {
      const stores = db
        .prepare("SELECT * FROM stores WHERE organizationId = ?")
        .all(organizationId);

      if (stores.length > 0) {
        console.log("Returning local stores:", stores);
        return stores;
      }

      console.log("No local stores found, fetching from API...");

      const apiResponse = await axios.get(`${apiUrl}/store/getStore`, {
        headers: {
          "Content-Type": "application/json",
          "organization-id": organizationId,
        },
      });

      const apiStores = apiResponse.data.data;

      if (!Array.isArray(apiStores)) {
        console.error("Invalid API response:", apiStores);
        return [];
      }

      const insertStmt = db.prepare(`
        INSERT INTO stores (id, name, logo, taxRate, organizationId, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((stores) => {
        for (const store of stores) {
          insertStmt.run(
            store.id,
            store.name,
            store.logo || null,
            store.taxRate || 0,
            store.organizationId,
            store.createdAt,
            store.updatedAt,
            store.deletedAt || null
          );
        }
      });

      insertMany(apiStores);

      console.log("Fetched stores saved to local database.");
      return apiStores;
    } catch (error) {
      console.error("Error fetching stores:", error);
      return [];
    }
  });

  //fetch employee
  ipcMain.handle("getEmployeesByStore", async (_event, storeId) => {
    // console.log("Received request to get employees for storeId:", storeId);

    try {
      // Check if roles exist for this storeId in the local database
      const existingRoles = db
        .prepare("SELECT COUNT(*) AS count FROM roles WHERE storeId = ?")
        .get(storeId) as { count: number };

      if (existingRoles.count === 0) {
        console.log("No roles found locally for storeId, fetching from API...");

        const roleApiResponse = await axios.get(`${apiUrl}/roles/${storeId}`);
        const roles = roleApiResponse.data.data;

        if (Array.isArray(roles) && roles.length > 0) {
          const insertRoleStmt = db.prepare(
            `INSERT INTO roles (
              id, name, storeId,
              userManagement, orderManagement, inventoryManagement, reportManagement,
              menuManagement, settingManagement, roleManagement, kitchenManagement,
              cashManagement, customerManagement, supplierManagement,
              createdAt, updatedAt, deletedAt
            ) VALUES (
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?
            )
            ON CONFLICT(id) DO UPDATE SET
              name=excluded.name,
              userManagement=excluded.userManagement,
              orderManagement=excluded.orderManagement,
              inventoryManagement=excluded.inventoryManagement,
              reportManagement=excluded.reportManagement,
              menuManagement=excluded.menuManagement,
              settingManagement=excluded.settingManagement,
              roleManagement=excluded.roleManagement,
              kitchenManagement=excluded.kitchenManagement,
              cashManagement=excluded.cashManagement,
              customerManagement=excluded.customerManagement,
              supplierManagement=excluded.supplierManagement,
              createdAt=excluded.createdAt,
              updatedAt=excluded.updatedAt,
              deletedAt=excluded.deletedAt`
          );

          const insertRoles = db.transaction((roles) => {
            for (const role of roles) {
              insertRoleStmt.run(
                role.id,
                role.name,
                role.storeId,

                role.userManagement ? 1 : 0,
                role.orderManagement ? 1 : 0,
                role.inventoryManagement ? 1 : 0,
                role.reportManagement ? 1 : 0,

                role.menuManagement ? 1 : 0,
                role.settingManagement ? 1 : 0,
                role.roleManagement ? 1 : 0,
                role.kitchenManagement ? 1 : 0,

                role.cashManagement ? 1 : 0,
                role.customerManagement ? 1 : 0,
                role.supplierManagement ? 1 : 0,

                role.createdAt ?? null,
                role.updatedAt ?? null,
                role.deletedAt ?? null
              );
            }
          });

          insertRoles(roles);
          console.log("Roles for storeId stored in the local database.");
        } else {
          console.error("Invalid roles API response:", roleApiResponse);
          return [];
        }
      } else {
        console.log(
          "Roles for storeId already exist locally, skipping API fetch."
        );
      }

      // Check if employees exist for this storeId in the local DB
      const employees = db
        .prepare(
          `SELECT employees.*, roles.name AS roleName 
           FROM employees 
           LEFT JOIN roles ON employees.roleId = roles.id 
           WHERE employees.storeId = ?`
        )
        .all(storeId) as {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        roleName: string;
        avatarPath: string | null;
        createdAt: string;
        updatedAt: string;
        roleId: string;
        address: string;
        deletedAt: string | null;
        storeId: string;
        lastLogin: string | null;
      }[];
      console.log("Fetched employees from local DB:", employees);
      if (employees.length > 0) {
        console.log("Returning local employees with role names:", employees);
        return employees.map((emp) => ({
          id: emp.id,
          name: `${emp.firstName} ${emp.lastName}`,
          role: emp.roleName || "Unknown Role",
          image: emp.avatarPath,
          isAdmin: emp.roleName?.toLowerCase() === "admin",
          storeId: emp.storeId,
          createdAt: new Date(emp.createdAt).toLocaleString(),
          updatedAt: new Date(emp.updatedAt).toLocaleString(),
          deletedAt: emp.deletedAt
            ? new Date(emp.deletedAt).toLocaleString()
            : null,
          email: emp.email,
          phone: emp.phone,
          address: emp.address,
          lastLogin: emp.lastLogin
            ? new Date(emp.lastLogin).toLocaleString()
            : null,
        }));
      }

      console.log("No local employees found, fetching from API...");

      // Fetch Employees from API based on storeId
      const apiResponse = await axios.get(`${apiUrl}/employees/${storeId}`);
      console.log("API Response:", apiResponse.data);
      const apiEmployees = apiResponse.data.data;

      if (!Array.isArray(apiEmployees)) {
        console.error("Invalid employees API response:", apiResponse);
        return [];
      }

      // Insert Employees into Local DB
      const insertEmployeeStmt = db.prepare(
        `INSERT INTO employees (
            id, storeId, firstName, lastName, email, phone, roleId, createdAt, updatedAt, address, lastLogin
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            storeId=excluded.storeId, 
            firstName=excluded.firstName, 
            lastName=excluded.lastName, 
            email=excluded.email, 
            phone=excluded.phone, 
            roleId=excluded.roleId, 
            createdAt=excluded.createdAt, 
            updatedAt=excluded.updatedAt, 
            address=excluded.address, 
            lastLogin=excluded.lastLogin`
      );

      const insertEmployees = db.transaction((employees) => {
        for (const employee of employees) {
          console.log("Inserting employee:", employee);
          insertEmployeeStmt.run(
            employee.id,
            employee.storeId,
            employee.firstName,
            employee.lastName,
            employee.email,
            employee.phone,
            employee.roleId,
            employee.createdAt,
            employee.updatedAt,
            employee.address,
            employee.lastLogin
          );
        }
      });

      insertEmployees(apiEmployees);

      console.log("Inserted new employees into the local database.");

      // Fetch Updated Employees with Role Names
      const updatedEmployees = db
        .prepare(
          `SELECT employees.*, roles.name AS roleName 
           FROM employees 
           LEFT JOIN roles ON employees.roleId = roles.id 
           WHERE employees.storeId = ?`
        )
        .all(storeId) as {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        roleName: string;
        avatarPath: string | null;
        roleId: string;
        deletedAt: string | null;
        storeId: string;
      }[];

      return updatedEmployees.map((emp) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName}`,
        role: emp.roleName || "Unknown Role",
        image: emp.avatarPath,
        isAdmin: emp.roleName?.toLowerCase() === "admin",
        storeId: emp.storeId,
        deletedAt: emp.deletedAt
          ? new Date(emp.deletedAt).toLocaleString()
          : null,
        email: emp.email,
      }));
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [];
    }
  });

  // fetch category
  ipcMain.handle("getCategories", async (_event, storeId) => {
    console.log("Received request to get categories for storeId:", storeId);

    try {
      // Fetch from local DB
      const categories = db
        .prepare("SELECT * FROM categories WHERE storeId = ?")
        .all(storeId);

      if (categories.length > 0) {
        console.log("Returning local categories:", categories);
        return categories;
      }

      console.log("No local categories found, fetching from API...");

      // Fetch from API
      const apiResponse = await axios.get(`${apiUrl}/category/get/${storeId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const apiCategories = apiResponse.data.data;
      console.log("API categories:", apiCategories);

      if (!Array.isArray(apiCategories)) {
        console.error("Invalid API response format:", apiCategories);
        return [];
      }

      // Insert into local DB
      const insertStmt = db.prepare(`
        INSERT INTO categories (id, name, storeId, status, createdAt, updatedAt, deletedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((categories) => {
        for (const category of categories) {
          insertStmt.run(
            category.id,
            category.name,
            category.storeId,
            category.status ? 1 : 0,
            category.createdAt,
            category.updatedAt,
            category.deletedAt || null
          );
        }
      });

      insertMany(apiCategories);

      console.log("Categories synced to local DB.");
      return apiCategories;
    } catch (error) {
      console.error("Error fetching categories:", error);
      return [];
    }
  });

  // fetch inventory
  ipcMain.handle("getInventory", async (_event, storeId) => {
    console.log("Received request to get inventory for storeId:", storeId);

    try {
      // Try local fetch first
      const inventory = db
        .prepare(
          `
          SELECT i.id, i.storeId, i.name, i.quantity, i.threshold, i.supplier,
                 i.createdById,
                 (e.firstName || ' ' || e.lastName) AS createdBy,
                 i.createdAt, i.updatedAt, i.deletedAt
          FROM inventory i
          LEFT JOIN employees e ON i.createdById = e.id
          WHERE i.storeId = ?
        `
        )
        .all(storeId);

      if (inventory.length > 0) {
        console.log("Returning local inventory:", inventory);
        return inventory;
      }

      console.log("No local inventory found, fetching from API...");

      // Fetch from API
      const apiResponse = await axios.get(
        `${apiUrl}/inventory/get/${storeId}`,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const apiInventory = apiResponse.data.data;
      console.log("API Inventory Response:", apiInventory);

      if (!Array.isArray(apiInventory)) {
        console.error("Invalid API response:", apiInventory);
        return [];
      }

      // Prepare to insert into SQLite
      const insertStmt = db.prepare(`
        INSERT INTO inventory (
          id, storeId, name, quantity, threshold, supplier,
          createdById, createdAt, updatedAt, deletedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((items) => {
        for (const item of items) {
          insertStmt.run(
            item.id,
            item.storeId,
            item.name,
            item.quantity,
            item.threshold || null,
            item.supplier || null,
            item.createdById || null,
            item.createdAt,
            item.updatedAt,
            item.deletedAt || null
          );
        }
      });

      insertMany(apiInventory);
      console.log("Inventory synced to local database.");

      // Refetch with employee names
      const updatedInventory = db
        .prepare(
          `
          SELECT i.id, i.storeId, i.name, i.quantity, i.threshold, i.supplier,
                 i.createdById,
                 (e.firstName || ' ' || e.lastName) AS createdBy,
                 i.createdAt, i.updatedAt, i.deletedAt
          FROM inventory i
          LEFT JOIN employees e ON i.createdById = e.id
          WHERE i.storeId = ?
        `
        )
        .all(storeId);

      return updatedInventory;
    } catch (error) {
      console.error("Error fetching inventory:", error);
      return [];
    }
  });

  // fetch dishes
  ipcMain.handle("getDishes", async (_event, storeId) => {
    console.log("Received request to get dishes for storeId:", storeId);
    try {
      const dishQuery = `
        SELECT d.*, e.firstName, e.lastName, c.name AS categoryName
        FROM Dish d
        LEFT JOIN employees e ON d.employeeId = e.id
        LEFT JOIN categories c ON d.categoryId = c.id
        WHERE d.storeId = ?
      `;
      const localDishes = db.prepare(dishQuery).all(storeId);

      const insertAddon = db.prepare(`
        INSERT INTO addons (
          id, name, price, dishId, storeId,
          createdAt, updatedAt, deletedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const enrichDishes = (dishes: any[]) => {
        return dishes.map((dish) => {
          const inventories = db
            .prepare(
              `SELECT di.id, di.inventoryItemId, i.name AS itemName, di.quantity, di.defaultSelected
               FROM DishInventory di
               LEFT JOIN inventory i ON di.inventoryItemId = i.id
               WHERE di.dishId = ?`
            )
            .all(dish.id);

          const addons = db
            .prepare(
              `SELECT id, name, price FROM addons WHERE dishId = ? AND deletedAt IS NULL`
            )
            .all(dish.id);

          const { addOns, ...rest } = dish;

          return {
            ...rest,
            createdBy:
              dish.firstName && dish.lastName
                ? `${dish.firstName} ${dish.lastName}`
                : null,
            categoryName: dish.categoryName || null,
            dishInventories: inventories,
            addons,
          };
        });
      };

      if (localDishes.length > 0) {
        const enriched = enrichDishes(localDishes);
        console.log("Returning local dishes:", enriched.length);
        return enriched;
      }

      // Fetch from API if not found locally
      console.log("No local dishes found. Fetching from API...");
      const response = await axios.get(`${apiUrl}/dish/get/${storeId}`, {
        headers: { "Content-Type": "application/json" },
      });
      const apiDishes = response.data.data || [];

      const insertDish = db.prepare(`
        INSERT INTO Dish (
          id, name, rating, addOns, bowls, persons, price, imageUrl, itemDetails,
          deletedAt, storeId, employeeId, categoryId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertDI = db.prepare(`
        INSERT INTO DishInventory (
          id, dishId, inventoryItemId, defaultSelected, quantity
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((dishes: any[]) => {
        for (const dish of dishes) {
          insertDish.run(
            dish.id,
            dish.name,
            dish.rating || null,
            JSON.stringify(dish.addOns || []),
            dish.bowls || 1,
            dish.persons || 1,
            dish.price,
            dish.imageUrl || null,
            dish.itemDetails || null,
            dish.deletedAt || null,
            dish.storeId,
            dish.employeeId || null,
            dish.categoryId || null
          );
        }
      });

      insertMany(apiDishes);
      console.log(`Inserted ${apiDishes.length} dishes.`);

      for (const dish of apiDishes) {
        const diRes = await axios.get(`${apiUrl}/dishInventory/get/${dish.id}`);
        const inventories = diRes.data.data || [];

        console.log(
          `Fetched ${inventories} inventories for dish ID ${dish.id}`
        );
        // Fetch and insert Addons
        const addonRes = await axios.get(`${apiUrl}/addon/get/${dish.id}`);
        const addons = addonRes.data.data || [];

        console.log(`Fetched ${addons.length} addons for dish ID ${dish.id}`);

        for (const addon of addons) {
          try {
            insertAddon.run(
              addon.id,
              addon.name,
              addon.price,
              addon.dishId,
              addon.storeId,
              addon.createdAt || null,
              addon.updatedAt || null,
              addon.deletedAt || null
            );
          } catch (err: any) {
            console.error(`Failed to insert Addon:`, err.message);
          }
        }

        for (const inv of inventories) {
          try {
            insertDI.run(
              inv.id,
              inv.dishId,
              inv.inventoryItemId,
              inv.defaultSelected ? 1 : 0,
              Number(inv.quantity) || 1
            );
          } catch (err: any) {
            console.error(`Failed to insert DishInventory:`, err.message);
          }
        }
      }

      // Fetch enriched updated dishes
      const updatedDishes = db.prepare(dishQuery).all(storeId);
      const enriched = enrichDishes(updatedDishes);
      console.log("Returning updated dishes with inventories:", enriched);
      return enriched;
    } catch (error: any) {
      console.error("Error in getDishes:", error.message);
      return [];
    }
  });

  // fetch addons
  ipcMain.handle("getAddonsByStoreId", async (_event, storeId) => {
    try {
      const localAddons = db
        .prepare(
          `SELECT a.id, a.name, a.price, a.dishId, a.storeId, d.name AS dishName, a.createdAt, a.updatedAt
           FROM addons a
           LEFT JOIN Dish d ON a.dishId = d.id
           WHERE a.storeId = ? AND a.deletedAt IS NULL`
        )
        .all(storeId);

      if (localAddons.length > 0) {
        console.log(
          `Found ${localAddons.length} addons locally for storeId ${storeId}`
        );

        return localAddons.map((addon) => ({
          ...(addon as {
            id: string;
            name: string;
            price: number;
            dishId: string;
            storeId: string;
            dishName: string | null;
            createdAt: string | null;
            updatedAt: string | null;
          }),
          dishName: (addon as { dishName: string | null }).dishName || null,
        }));
      }

      console.log(
        `No local addons found for storeId ${storeId}. Fetching from API...`
      );
      const res = await axios.get(`${apiUrl}/addon/getAll/${storeId}`);
      const apiAddons = res.data.data || [];

      if (apiAddons.length === 0) {
        console.log(`No addons found from the API for storeId ${storeId}`);
        return [];
      }

      const insertAddon = db.prepare(`
        INSERT INTO addons (
          id, name, price, dishId, storeId,
          createdAt, updatedAt, deletedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((addons: any[]) => {
        for (const addon of addons) {
          insertAddon.run(
            addon.id,
            addon.name,
            addon.price,
            addon.dishId,
            addon.storeId,
            addon.createdAt || null,
            addon.updatedAt || null,
            addon.deletedAt || null
          );
        }
      });

      insertMany(apiAddons);

      const enrichedAddons = apiAddons.map((addon) => {
        const dish = db
          .prepare(`SELECT name FROM Dish WHERE id = ?`)
          .get(addon.dishId) as { name: string } | undefined;

        return {
          ...addon,
          dishName: dish ? dish.name : null,
          createdAt: addon.createdAt || null,
          updatedAt: addon.updatedAt || null,
        };
      });

      console.log(`Inserted ${apiAddons.length} addons from API.`);
      return enrichedAddons;
    } catch (error: any) {
      console.error("Error in getAddonsByStoreId:", error.message);
      return [];
    }
  });

  // fetch roles
  ipcMain.handle("getRoles", async (_event, storeId) => {
    console.log("Received request to get roles for storeId:", storeId);

    try {
      const roles = db
        .prepare(
          "SELECT * FROM roles WHERE storeId = ? ORDER BY datetime(createdAt) ASC"
        )
        .all(storeId);

      console.log("Returning local roles:", roles);
      return roles;
    } catch (error) {
      console.error("Error fetching roles from local DB:", error);
      return [];
    }
  });

  // fetch employee
  ipcMain.handle("getEmployees", async (_event, storeId) => {
    console.log("Received request to get employees for storeId:", storeId);

    try {
      const employees = db
        .prepare(
          `SELECT 
            e.*, 
            r.name AS roleName
          FROM employees e
          LEFT JOIN roles r ON e.roleId = r.id
          WHERE e.storeId = ?
          ORDER BY datetime(e.createdAt) DESC`
        )
        .all(storeId);

      console.log("Returning local employees with role names:", employees);
      return employees;
    } catch (error) {
      console.error("Error fetching employees from local DB:", error);
      return [];
    }
  });

  // fetch customer
  ipcMain.handle("getCustomers", async (_event, storeId) => {
    console.log("Fetching customers for storeId:", storeId);

    try {
      // Define the type for the customer
      type Customer = {
        id: string;
        storeId: string;
        name: string;
        phone: string;
        email: string;
        address: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
      };

      // Fetch customers from the local database
      let customers = db
        .prepare("SELECT * FROM customers WHERE storeId = ?")
        .all(storeId) as Customer[];

      // If no customers are found, fetch from the API
      if (customers.length === 0) {
        console.log("No local customers found, fetching from API...");

        const response = await axios.get(`${apiUrl}/customer/get/${storeId}`);
        const remoteCustomers = response.data.data;

        if (!Array.isArray(remoteCustomers)) {
          console.error("Invalid API response for customers.");
          return [];
        }

        // Insert remote customers into the local database
        const insertStmt = db.prepare(`
          INSERT INTO customers (
            id, storeId, name, phone, email, address,
            createdAt, updatedAt, deletedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((data) => {
          for (const c of data) {
            insertStmt.run(
              c.id,
              c.storeId,
              c.name,
              c.phone || "",
              c.email || "",
              c.address || "",
              c.createdAt,
              c.updatedAt,
              c.deletedAt || null
            );
          }
        });

        insertMany(remoteCustomers);
        console.log("Remote customers have been stored locally.");

        // Fetch the updated customers from the local database
        customers = db
          .prepare("SELECT * FROM customers WHERE storeId = ?")
          .all(storeId) as Customer[];
      }

      // Prepare the query for fetching orders related to each customer
      const getOrdersStmt = db.prepare(`
        SELECT id, name, quantity, status, customerId
        FROM orders
        WHERE customerId = ?
      `);

      // Map customers and attach their orders, ensuring correct types for orders
      const customersWithOrders: {
        id: string;
        storeId: string;
        name: string;
        phone: string;
        email: string;
        address: string;
        createdAt: string;
        updatedAt: string;
        deletedAt: string | null;
        orders: {
          id: string;
          name: string;
          quantity: number;
          status: string;
        }[];
      }[] = customers.map((customer) => {
        // Explicitly assert the type of customer here
        const typedCustomer = customer as Customer;

        // Fetch orders for the customer and assert the correct type
        const orders = getOrdersStmt.all(typedCustomer.id) as {
          id: string;
          name: string;
          quantity: number;
          status: string;
        }[];

        return {
          id: typedCustomer.id,
          storeId: typedCustomer.storeId,
          name: typedCustomer.name,
          phone: typedCustomer.phone,
          email: typedCustomer.email,
          address: typedCustomer.address,
          createdAt: typedCustomer.createdAt,
          updatedAt: typedCustomer.updatedAt,
          deletedAt: typedCustomer.deletedAt,
          orders,
        };
      });

      console.log("Returning customers with orders:", customersWithOrders);
      return customersWithOrders;
    } catch (error) {
      console.error("Error fetching customers:", error);
      return [];
    }
  });

  // fetch profile
  ipcMain.handle("getProfile", async (_event, userId) => {
    console.log("Received request to get profile for userId:", userId);

    try {
      const employee = db
        .prepare(
          `SELECT 
            e.*, 
            e.firstName || ' ' || e.lastName AS name, 
            r.name AS roleName,
            s.name AS storeName
          FROM employees e
          LEFT JOIN roles r ON e.roleId = r.id
          LEFT JOIN stores s ON e.storeId = s.id
          WHERE e.id = ?`
        )
        .get(userId);

      console.log("Returning profile with role and store name:", employee);
      return employee;
    } catch (error) {
      console.error("Error fetching profile from local DB:", error);
      return null;
    }
  });

  //fetch tables
  ipcMain.handle("getTables", async (_event, storeId) => {
    if (!storeId) {
      console.warn("No storeId provided to getTables");
      return { success: false, message: "Store ID is required" };
    }

    try {
      //try localDB
      const localTables = db
        .prepare(`SELECT * FROM tables WHERE storeId = ?`)
        .all(storeId);

      if (localTables.length > 0) {
        console.log("Returning tables from local SQLite");
        return { success: true, data: localTables };
      }

      // fetch from api
      const hasInternet = await checkInternet();
      if (hasInternet) {
        try {
          const res = await axios.get(`${apiUrl}/table/get/${storeId}`, {
            headers: { "Content-Type": "application/json" },
          });

          console.log("Fetched tables from remote server:", res.data.data);
          const fetchedTables = res.data?.data || [];

          console.log(`Fetched ${fetchedTables} tables from remote server`);

          const insert = db.prepare(`
            INSERT OR REPLACE INTO tables (
              id, storeId, name, chairs, status, customerName, reservationName, reservationTime,
              mergedIntoId, createdAt, updatedAt, deletedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const insertMany = db.transaction((tables) => {
            for (const table of tables) {
              insert.run(
                table.id,
                table.storeId,
                table.name,
                table.chairs ?? 0,
                table.status,
                table.customerName || null,
                table.reservationName || null,
                table.reservationTime || null,
                table.mergedIntoId || null,
                table.createdAt,
                table.updatedAt,
                table.deletedAt || null
              );
            }
          });

          insertMany(fetchedTables);

          console.log(
            "Tables fetched from server and saved locally",
            fetchedTables
          );
          return { success: true, data: fetchedTables };
        } catch (apiError) {
          console.warn("Failed to fetch from remote:", apiError.message);
          return { success: false, message: "Failed to fetch from server" };
        }
      } else {
        console.warn("No internet. Returning empty local result.");
        return { success: true, data: [] };
      }
    } catch (error) {
      console.error("Error in getTables IPC:", error);
      return {
        success: false,
        message: "Internal error fetching tables",
        error: error.message,
      };
    }
  });

  // delete category
  ipcMain.handle("deleteCategory", async (_event, categoryId) => {
    if (!categoryId) {
      console.warn("No categoryId provided to softDeleteCategory");
      return { success: false, message: "Category ID is required" };
    }

    try {
      const deletedAt = new Date().toISOString();
      const stmt = db.prepare(`
        UPDATE categories
        SET deletedAt = ?
        WHERE id = ?
      `);
      const result = stmt.run(deletedAt, categoryId);

      if (result.changes === 0) {
        console.warn(`No category found with ID: ${categoryId}`);
        return { success: false, message: "Category not found locally" };
      }

      console.log(`Category ${categoryId} soft-deleted locally.`);

      const hasInternet = await checkInternet();

      console.log("Internet status:", hasInternet);

      if (hasInternet) {
        try {
          await axios.patch(`${apiUrl}/category/delete/${categoryId}`, {
            headers: {
              "Content-Type": "application/json",
            },
          });
          console.log(" Category delete synced with remote server");
        } catch (apiError) {
          console.warn("Remote delete failed:", apiError.message);
        }
      } else {
        console.warn("Offline or server down. Delete will sync later.");
      }

      return {
        success: true,
        id: categoryId,
        message: "Category deleted successfully",
      };
    } catch (error) {
      console.error("Error in softDeleteCategory IPC:", error);
      return {
        success: false,
        message: "Internal error deleting category",
        error: error.message,
      };
    }
  });

  //update category status
  ipcMain.handle(
    "updateCategoryStatus",
    async (_event, { categoryId, newStatus }) => {
      if (!categoryId) {
        console.warn("No categoryId provided to updateCategoryStatus");
        return { success: false, message: "Category ID is required" };
      }

      if (typeof newStatus !== "boolean") {
        console.warn("Invalid status provided. Expected a boolean value");
        return {
          success: false,
          message: "Valid status (true/false) is required",
        };
      }

      try {
        const stmt = db.prepare(`
        UPDATE categories
        SET status = ?, updatedAt = ?
        WHERE id = ?
      `);
        const result = stmt.run(
          newStatus ? 1 : 0,
          new Date().toISOString(),
          categoryId
        );

        if (result.changes === 0) {
          console.warn(`No category found with ID: ${categoryId}`);
          return { success: false, message: "Category not found locally" };
        }

        console.log(
          `Category ${categoryId} status updated locally to ${
            newStatus ? "active" : "inactive"
          }.`
        );

        const online = await checkInternet();

        if (online) {
          try {
            await axios.patch(
              `${apiUrl}/category/status/${categoryId}`,
              { status: newStatus },
              {
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            console.log("Category status update synced with remote server");
          } catch (apiError) {
            console.warn("Remote update failed:", apiError.message);
          }
        } else {
          console.warn("Offline or server down. Update will sync later.");
        }

        return {
          success: true,
          id: categoryId,
          message: `Category status updated to ${
            newStatus ? "active" : "inactive"
          }`,
        };
      } catch (error) {
        console.error("Error in updateCategoryStatus IPC:", error);
        return {
          success: false,
          message: "Internal error updating category status",
          error: error.message,
        };
      }
    }
  );

  ipcMain.handle("deleteDish", async (_event, dishId) => {
    try {
      // Update Dish locally
      const deletedAt = new Date().toISOString();
      await db
        .prepare(`UPDATE Dish SET deletedAt = ? WHERE id = ?`)
        .run(deletedAt, dishId);

      // Update related Addons locally
      await db
        .prepare(`UPDATE addons SET deletedAt = ? WHERE dishId = ?`)
        .run(deletedAt, dishId);

      console.log(`Locally deleted dish ${dishId} and its addons.`);

      const online = await checkInternet();
      if (online) {
        // Sync with remote server
        await axios.patch(`${apiUrl}/dish/delete/${dishId}`);

        console.log(`Remote dish and addons deleted.`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to delete:", error);
      return { success: false, error: error.message };
    }
  });

  //delete addon
  ipcMain.handle("deleteAddons", async (_event, addonId: string) => {
    try {
      const deletedAt = new Date().toISOString();

      // Update Addon locally
      await db
        .prepare(`UPDATE addons SET deletedAt = ? WHERE id = ?`)
        .run(deletedAt, addonId);

      console.log(`Locally deleted addon ${addonId}.`);

      const online = await checkInternet();
      if (online) {
        // Sync with remote server
        await axios.patch(`${apiUrl}/addon/delete//${addonId}`);

        console.log(`Remote addon deleted.`);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Failed to delete addon:", error);
      return { success: false, error: error.message };
    }
  });

  //fetch orders
  ipcMain.handle("getOrders", async (_event, storeId) => {
    console.log("Received request to get orders for storeId:", storeId);

    try {
      // Fetch from local DB
      const localOrders = db
        .prepare("SELECT * FROM orders WHERE storeId = ?")
        .all(storeId);

      if (localOrders.length > 0) {
        console.log("Returning local orders:", localOrders);
        return localOrders;
      }

      console.log("No local orders found, fetching from API...");

      // Fetch from API
      const apiResponse = await axios.get(`${apiUrl}/order/get/${storeId}`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      const apiOrders = apiResponse.data.data;
      console.log("API orders:", apiOrders);

      if (!Array.isArray(apiOrders)) {
        console.error("Invalid API response format:", apiOrders);
        return [];
      }

      // Prepare insert statements
      const insertOrder = db.prepare(`
        INSERT INTO orders (
          id, storeId, customerId, orderType, status, deliveryStatus,
          amount, paymentStatus, peakAt, notes, assignedStaff,
          createdBy, updatedOn, createdAt, deletedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const insertOrderItem = db.prepare(`
        INSERT INTO order_items (
          id, orderId, dishId, quantity, price
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const insertOrderItemAddon = db.prepare(`
        INSERT INTO order_item_addons (
          id, orderItemId, addonId, addonName, addonPrice
        ) VALUES (?, ?, ?, ?, ?)
      `);

      const insertMany = db.transaction((orders) => {
        for (const order of orders) {
          insertOrder.run(
            order.id,
            order.storeId,
            order.customerId,
            order.orderType,
            order.status,
            order.deliveryStatus,
            order.amount,
            order.paymentStatus,
            order.peakAt,
            order.notes,
            order.assignedStaff,
            order.createdBy,
            order.updatedOn,
            order.createdAt,
            order.deletedAt
          );

          for (const item of order.OrderItems || []) {
            insertOrderItem.run(
              item.id,
              item.orderId,
              item.dishId,
              item.quantity,
              item.price
            );

            for (const addon of item.OrderItemAddons || []) {
              insertOrderItemAddon.run(
                addon.id,
                addon.orderItemId,
                addon.addonId,
                addon.addon?.name || addon.addonName || "",
                addon.addon?.price || addon.addonPrice || 0
              );
            }
          }
        }
      });

      insertMany(apiOrders);

      console.log("Orders synced to local DB.");
      return apiOrders;
    } catch (error) {
      console.error("Error fetching orders:", error);
      return [];
    }
  });

  // employee login
  ipcMain.handle("employeeLogin", async (_event, { email, pin }) => {
    try {
      const response = await axios.post(`${apiUrl}/employee/login`, {
        email,
        pin,
      });

      const employee = response.data?.data?.employee;

      if (employee) {
        await setEmployeeCookie(employee);
        console.log("Employee cookie set successfully");
      }

      return { success: true, data: employee, message: "Login successful" };
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || "An error occurred during login.";
      return { success: false, message: errorMessage };
    }
  });

  // Handle get employee
  ipcMain.handle("getEmployeeData", async () => {
    const employee = await getEmployeeCookie();
    return employee
      ? { success: true, data: employee }
      : { success: false, message: "Not logged in" };
  });

  // Handle logout
  ipcMain.handle("logoutEmployee", async () => {
    await clearEmployeeCookie();
    return { success: true, message: "Employee logged out" };
  });

  // sync actions

  // add employee
  ipcMain.handle("syncEmployees", async (_event, storeId) => {
    try {
      const apiResponse = await axios.get(`${apiUrl}/employees/${storeId}`);
      const apiEmployees = apiResponse.data.data;

      if (!Array.isArray(apiEmployees)) {
        console.error(
          "Invalid employees API response during sync:",
          apiResponse
        );
        return false;
      }

      const insertEmployeeStmt = db.prepare(
        `INSERT INTO employees (
            id, storeId, firstName, lastName, email, phone, roleId, createdAt, updatedAt, address, lastLogin
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
            storeId=excluded.storeId, 
            firstName=excluded.firstName, 
            lastName=excluded.lastName, 
            email=excluded.email, 
            phone=excluded.phone, 
            roleId=excluded.roleId, 
            createdAt=excluded.createdAt, 
            updatedAt=excluded.updatedAt, 
            address=excluded.address, 
            lastLogin=excluded.lastLogin`
      );

      const insertEmployees = db.transaction((employees) => {
        for (const employee of employees) {
          insertEmployeeStmt.run(
            employee.id,
            employee.storeId,
            employee.firstName,
            employee.lastName,
            employee.email,
            employee.phone,
            employee.roleId,
            employee.createdAt,
            employee.updatedAt,
            employee.address,
            employee.lastLogin
          );
        }
      });

      insertEmployees(apiEmployees);
      console.log("Synced employees from API to local DB.");
      return true;
    } catch (error) {
      console.error("Failed to sync employees:", error);
      return false;
    }
  });
}
