<script>
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { Home, FileText, Calendar, ListChecks, ClipboardCheck, ClipboardEdit, LogOut } from "lucide-svelte"; 

  let token = "";
  let role = "";
  let currentPath = "";

  page.subscribe((p) => {
    currentPath = p.url.pathname;
  });

  onMount(() => {
    if (typeof window !== "undefined") {
      token = localStorage.getItem("token") || "";
      role = localStorage.getItem("role") || "";

      console.log("Role:", role);
    }
  });

  function navigateTo(path) {
    goto(path);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    goto("/auth/login");
  }

  // ✅ ฟังก์ชันเช็คว่าเมนูไหนกำลังเปิดอยู่
  function isActive(path) {
    return currentPath === path ? "bg-gray-200 text-gray-900 rounded-lg px-3 py-2" : "text-gray-700 hover:text-orange-500";
  }
</script>

<nav class="bg-white shadow-md py-4 px-6 flex justify-between items-center">
  <!-- โลโก้ -->
  <div class="flex items-center space-x-4">
    <img src="/SFA_e-Filling.png" alt="KMUTT" class="logo w-[120px] h-auto">
  </div>

  <!-- เมนูหลัก -->
  <div class="flex space-x-6">
    <!-- 🔹 หน้าแรก -->
    <button on:click={() => navigateTo("/app/dashboard")} class={"flex items-center space-x-2 " + isActive("/app/dashboard")}>
      <Home size="20" />
      <span class="hidden md:block">หน้าหลัก</span>
    </button>

    {#if role === "student"}
      <!-- 🔹 สำหรับ Student: ยื่นใบรับรอง -->
      <button on:click={() => navigateTo("/app/submit-certificate")} class={"flex items-center space-x-2 " + isActive("/app/submit-certificate")}>
        <FileText size="20" />
        <span class="hidden md:block">ยื่นใบรับรอง</span>
      </button>
    {/if}

    {#if role === "admin"}
      <!-- 🔹 สำหรับ Admin -->
      <button on:click={() => navigateTo("/app/manage-academic-year")} class={"flex items-center space-x-2 " + isActive("/app/manage-academic-year")}>
        <Calendar size="20" />
        <span class="hidden md:block">จัดการปีการศึกษา</span>
      </button>

      <button on:click={() => navigateTo("/app/pending-approvals")} class={"flex items-center space-x-2 " + isActive("/app/pending-approvals")}>
        <ListChecks size="20" />
        <span class="hidden md:block">รอดำเนินการ</span>
      </button>

      <button on:click={() => navigateTo("/app/completed-certificates")} class={"flex items-center space-x-2 " + isActive("/app/completed-certificates")}>
        <ClipboardCheck size="20" />
        <span class="hidden md:block">สำเร็จแล้ว</span>
      </button>

      <button on:click={() => navigateTo("/app/manage-certificates")} class={"flex items-center space-x-2 " + isActive("/app/manage-certificates")}>
        <ClipboardEdit size="20" />
        <span class="hidden md:block">จัดการหัวข้อ</span>
      </button>
    {/if}
  </div>

  <!-- ปุ่มออกจากระบบ -->
  <button on:click={handleLogout} class="flex items-center space-x-2 text-gray-700 hover:text-red-500">
    <LogOut size="20" />
    <span class="hidden sm:block">ออกจากระบบ</span>
  </button>
</nav>
