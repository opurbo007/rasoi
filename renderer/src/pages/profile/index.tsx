"use client";

// Global Imports
import React, { useEffect, useState } from "react";
import { Bell, CheckCircle, Truck } from "lucide-react";
// Local Imports
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ShiftLog from "@/components/Shift-log";
import UploadProfile from "@/components/Upload-profile";
import { Avatar } from "@heroui/avatar";
import { Button, Input } from "@heroui/react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmployeeStore } from "@/stores/store";
import NotFound from "@/components/error/NotFound";

// const user = {
//   name: "Esther Howard",
//   email: "estherhoward@gmail.com",
//   role: "Admin",
//   franchise: "Coca Cola",
//   photo: "/images/placeholder.jpg",
//   phone: "765464544",
//   username: "opurbo7",
//   password: "",
// };

const notifications: Array<{
  iconType: "order" | "update" | "delivery";
  message: string;
  date: string;
}> = [
  {
    iconType: "order",
    message:
      "New order placed for a table of 4: Spaghetti, Caesar Salad, and drinks.",
    date: "Feb 5, 2025 at 11:28 AM",
  },
  {
    iconType: "update",
    message: "Updated order for Table 3: Extra cheese added to the pizza.",
    date: "Feb 5, 2025 at 12:15 PM",
  },
  {
    iconType: "delivery",
    message: "Order #45 has been dispatched for delivery: Burger and Fries.",
    date: "Feb 5, 2025 at 01:30 PM",
  },
];

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const employee = useEmployeeStore((state) => state.employee);
  // console.log("Employee:", employee);

  const userId = employee?.id || "";

  console.log("emp ID:", userId);

  if (!userId) {
    return <NotFound text="User ID not found" />;
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await window.ipc.invoke("getProfile", userId);
        console.log(user);
        setUser(user);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  if (!user) {
    return <NotFound text="User not found" />;
  }

  return (
    <ScrollArea className="container mx-auto rounded-md h-[95%] ">
      <h2 className="text-2xl font-semibold text-customPrimary-500 text-center">
        Account Details
      </h2>
      <div className="flex flex-wrap justify-start items-center gap-5">
        {loading ? (
          <Skeleton className="w-28 h-28 rounded-full" />
        ) : (
          <Avatar
            // name={user?.name?.split(" ")[0] || ""}
            className="w-28 h-28 object-cover"
            src={user?.avatarPath || "/userPlaceholder.png"}
          />
        )}
        <div className="text-sm capitalize font-medium space-y-0.5">
          {loading ? (
            <>
              <Skeleton className="w-40 h-6" />
              <Skeleton className="w-44 h-6" />
              <Skeleton className="w-64 h-6" />
              <Skeleton className="w-48 h-6" />
            </>
          ) : (
            <>
              <p className="text-black/60 text-lg">{user?.name || "N/A"}</p>
              <p>
                Email:
                <span className="ml-2 text-black/60">
                  {user?.email || "No Email"}
                </span>
              </p>
              <p>
                Store:
                <span className="ml-2 text-black/60">
                  {user?.storeName || "Not Assigned"}
                </span>
              </p>
              <p>
                Role:
                <span className="ml-2 text-black/60">
                  {user?.roleName || "Not Assigned"}
                </span>
              </p>
            </>
          )}
        </div>
      </div>
      <UploadProfile previousImage={user?.avatarPath || ""} />

      <Tabs defaultValue="profile">
        <TabsList className="grid w-full grid-cols-3 bg-customPrimary-50">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:text-customPrimary-500"
          >
            Profile Information
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="data-[state=active]:text-customPrimary-500"
          >
            Activity Log
          </TabsTrigger>
          <TabsTrigger
            value="shift"
            className="data-[state=active]:text-customPrimary-500"
          >
            Shift Log
          </TabsTrigger>
        </TabsList>

        {/* Profile Information Tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-2 gap-5 my-3">
            <InputField label="Full name" value={user.name} />
            <InputField label="Email" value={user.email} />
            <InputField label="Phone no" value={user.phone} />
            <PasswordInput label="Current Password" />
            <PasswordInput label="New Password" />
          </div>
          <div className="flex justify-end">
            <Button radius="sm" className="bg-customPrimary-500 text-white ">
              Update Profile
            </Button>
          </div>
        </TabsContent>

        {/* Activity Log Tab */}
        <TabsContent value="activity" className="container">
          <ScrollArea className="h-80">
            {notifications.map((notification, index) => (
              <Notifications
                key={index}
                iconType={notification.iconType}
                message={notification.message}
                date={notification.date}
              />
            ))}
          </ScrollArea>
        </TabsContent>

        {/* Shift Log Tab */}
        <TabsContent value="shift">
          <ShiftLog />
        </TabsContent>
      </Tabs>
    </ScrollArea>
  );
}

// Reusable Input Component for Profile Information
const InputField: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="space-y-2">
    <h5 className="text-body font-semibold">{label}</h5>
    <Input
      type="text"
      classNames={{
        inputWrapper: "bg-white w-full h-12 rounded-lg",
        input: "group-data-[has-value=true]:text-itSecondary-500",
        errorMessage: "text-red-500",
      }}
      variant="bordered"
      value={value}
    />
  </div>
);

// Reusable Password Input Component
const PasswordInput: React.FC<{ label: string }> = ({ label }) => (
  <div className="space-y-2">
    <h5 className="text-body font-semibold">{label}</h5>
    <Input
      type="password"
      classNames={{
        inputWrapper: "bg-white w-full h-12 rounded-lg",
        input: "group-data-[has-value=true]:text-itSecondary-500",
        errorMessage: "text-red-500",
      }}
      variant="bordered"
    />
  </div>
);

type NotificationProps = {
  iconType: "order" | "update" | "delivery";
  message: string;
  date: string;
};

export const Notifications: React.FC<NotificationProps> = ({
  iconType,
  message,
  date,
}) => {
  const iconMap = {
    order: <Bell className="text-blue-500" size={24} />,
    update: <CheckCircle className="text-green-500" size={24} />,
    delivery: <Truck className="text-orange-500" size={24} />,
  };

  return (
    <div className="flex items-center gap-4 my-2 p-3 border rounded-lg shadow-sm bg-white">
      <div className="p-2 bg-gray-100 rounded-full">{iconMap[iconType]}</div>
      <div>
        <h5 className="font-medium text-gray-800">{message}</h5>
        <p className="text-gray-500 text-sm">{date}</p>
      </div>
    </div>
  );
};
