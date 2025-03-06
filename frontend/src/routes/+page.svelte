<script>
  import { onMount } from "svelte";
  import { goto } from "$app/navigation"; // ✅ ใช้ goto() แทน window.location
  import { browser } from "$app/environment"; // ✅ ตรวจสอบ Client-side

  let token = "";
  let isLoading = true; // ✅ เพิ่ม state เพื่อตรวจสอบการโหลด

  onMount(() => {
    if (browser) {
      token = localStorage.getItem("token");
      isLoading = false; // ✅ เมื่อโหลดเสร็จแล้ว ให้เปลี่ยนค่า isLoading

      if (token) {
        localStorage.setItem("token", res.token);
        goto("/app/dashboard");
      } else {
        goto("/auth/login");
      }
    }
  });
</script>

{#if isLoading}
  <p>Loading...</p>
{:else}
  <p>Redirecting...</p>
{/if}
