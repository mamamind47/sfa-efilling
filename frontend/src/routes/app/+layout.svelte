<script>
  import Navbar from "../../components/Navbar.svelte";
  import { browser } from "$app/environment";

  let token = "";

  // ตรวจสอบ Token
  if (browser) {
    token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/auth/login"; // Redirect ถ้ายังไม่ได้ Login
    }
  }
</script>

<div class="min-h-screen flex flex-col">
  <!-- Navbar -->
  <Navbar />

  <!-- เนื้อหาหลัก -->
  <div class="flex-1 bg-gray-100">
    <slot />
  </div>
</div>
