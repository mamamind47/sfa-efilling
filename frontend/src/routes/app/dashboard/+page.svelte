<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let token = "";

  // ตรวจสอบการมี Token ใน localStorage หรือไม่
  onMount(() => {
    token = localStorage.getItem("token");
    if (!token) {
      // ✅ ใช้ goto() เพื่อ Redirect
      goto("/auth/login");
    }
  });
</script>

<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="card w-96 bg-white shadow-lg p-6 rounded-lg">
    <h1 class="text-xl font-bold text-center mb-4">Welcome to Dashboard</h1>
    <p class="text-center">You are logged in and have access to the Dashboard!</p>
  </div>
</div>
