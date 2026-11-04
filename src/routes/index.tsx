import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ร้านรุ่งอรุณ มินิมาร์ท — ระบบหลังร้าน" },
      { name: "description", content: "เข้าสู่ระบบหลังร้านของร้านรุ่งอรุณ มินิมาร์ท" },
      { property: "og:title", content: "ร้านรุ่งอรุณ มินิมาร์ท — ระบบหลังร้าน" },
      { property: "og:description", content: "เข้าสู่ระบบหลังร้านของร้านรุ่งอรุณ มินิมาร์ท" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
