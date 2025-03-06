<script>
  import { onMount } from "svelte";
  import { API_BASE_URL } from "$lib/api";
  import { ClipboardEdit, PlusCircle, Pencil, Trash } from "lucide-svelte";

  let certificates = [];
  let certificate_code = "";
  let certificate_name = "";
  let hours = "";
  let is_active = 1;
  let isCreating = false;
  let isLoading = true;

  let isModalOpen = false;
  let editId = null;
  let editCode = "";
  let editName = "";
  let editHours = "";
  let editStatus = 1;

  // ✅ โหลดข้อมูลใบรับรอง
  async function fetchCertificates() {
    try {
      const res = await fetch(`${API_BASE_URL}/certificate`);
      certificates = await res.json();
    } catch (error) {
      console.error("❌ Error fetching certificates:", error);
    } finally {
      isLoading = false;
    }
  }


  // ✅ สร้างใบรับรองใหม่
//   async function createCertificate() {
//     isCreating = true;
//     try {
//       const res = await fetch(`${API_BASE_URL}/certificate`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ certificate_code, certificate_name, hours, is_active }),
//       });

//       if (res.ok) {
//         await fetchCertificates();
//         certificate_code = "";
//         certificate_name = "";
//         hours = "";
//         is_active = 1;
//       } else {
//         alert("❌ ไม่สามารถสร้างใบรับรองได้");
//       }
//     } catch (error) {
//       console.error("❌ Error creating certificate:", error);
//     } finally {
//       isCreating = false;
//     }
//   }


async function createCertificate() {
  if (!certificate_code || !certificate_name || !hours) {
    alert("กรุณากรอกข้อมูลให้ครบถ้วน");
    return;
  }

  // ✅ ตรวจสอบว่าชั่วโมงเป็นตัวเลข
  if (isNaN(hours) || hours <= 0) {
    alert("กรุณาใส่จำนวนชั่วโมงให้ถูกต้อง");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/certificate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        certificate_code,
        certificate_name,
        hours: parseInt(hours, 10), // ✅ แปลงค่าก่อนส่ง
        is_active: 1,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`❌ ${data.error || "สร้างใบรับรองไม่สำเร็จ"}`);
      return;
    }

    alert("✅ เพิ่มหัวข้อใบรับรองสำเร็จ");
    fetchCertificates(); // โหลดข้อมูลใหม่
    certificate_code = "";
    certificate_name = "";
    hours = "";
  } catch (error) {
    console.error("❌ Error creating certificate:", error);
    alert("❌ มีข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
  }
}


// ✅ เปิด Modal แก้ไขใบรับรอง
  function openEditModal(certificate) {
    isModalOpen = true;
    editId = certificate.certificate_type_id;
    editCode = certificate.certificate_code;
    editName = certificate.certificate_name;
    editHours = certificate.hours;
    editStatus = certificate.is_active;
  }

  // ✅ ปิด Modal
  function closeModal() {
    isModalOpen = false;
  }

  // ✅ แก้ไขใบรับรอง
  async function updateCertificate() {
    try {
      const res = await fetch(`${API_BASE_URL}/certificate/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_code: editCode, certificate_name: editName, hours: editHours, is_active: editStatus }),
      });

      if (res.ok) {
        await fetchCertificates();
        closeModal();
      } else {
        alert("❌ อัปเดตใบรับรองไม่สำเร็จ");
      }
    } catch (error) {
      console.error("❌ Error updating certificate:", error);
    }
  }

  // ✅ ปิด/เปิดใช้งานใบรับรอง
  async function toggleCertificateStatus(id, currentStatus) {
    try {
      const res = await fetch(`${API_BASE_URL}/certificate/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: currentStatus ? 0 : 1 }),
      });

      if (res.ok) {
        await fetchCertificates();
      } else {
        alert("❌ ไม่สามารถอัปเดตสถานะได้");
      }
    } catch (error) {
      console.error("❌ Error toggling status:", error);
    }
  }

  // ✅ ลบใบรับรอง
  async function deleteCertificate(id) {
    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบ?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/certificate/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchCertificates();
      } else {
        alert("❌ ไม่สามารถลบใบรับรองได้");
      }
    } catch (error) {
      console.error("❌ Error deleting certificate:", error);
    }
  }

  // ✅ โหลดข้อมูลเมื่อเปิดหน้า
  onMount(fetchCertificates);
</script>

<style>
  th, td {
    color: black;
  }
</style>

<div class="p-6">
  <h1 class="text-2xl font-bold mb-4 flex items-center space-x-2 text-black">
    <ClipboardEdit class="text-orange-500" size="24" />
    <span>จัดการหัวข้อใบรับรอง</span>
  </h1>

  <!-- ✅ ฟอร์มเพิ่มใบรับรอง -->
  <div class="bg-white p-4 rounded-lg shadow-md mb-6">
    <h2 class="text-lg font-semibold mb-2 text-black">เพิ่มหัวข้อใบรับรอง</h2>
    <div class="grid grid-cols-4 gap-4">
      <input type="text" placeholder="รหัส" bind:value={certificate_code} class="p-2 border rounded text-black" />
      <input type="text" placeholder="ชื่อใบรับรอง" bind:value={certificate_name} class="p-2 border rounded text-black" />
      <input type="number" placeholder="จำนวนชั่วโมง" bind:value={hours} class="p-2 border rounded text-black" />
      <button on:click={createCertificate} class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition">
        {isCreating ? "กำลังสร้าง..." : "เพิ่ม"}
      </button>
    </div>
  </div>

  <!-- ✅ ตารางแสดงรายการ -->
  {#if isLoading}
    <p class="text-center text-black">กำลังโหลดข้อมูล...</p>
  {:else if certificates.length === 0}
    <p class="text-center text-gray-500">ยังไม่มีข้อมูล</p>
  {:else}
    <div class="bg-white p-4 rounded-lg shadow-md">
      <table class="w-full border-collapse">
        <thead class="bg-gray-200">
          <tr>
            <th class="p-2 text-left">รหัส</th>
            <th class="p-2 text-left">ชื่อใบรับรอง</th>
            <th class="p-2 text-left">ชั่วโมง</th>
            <th class="p-2 text-center">สถานะ</th>
            <th class="p-2 text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {#each certificates as cert}
            <tr class="border-b">
              <td class="p-2">{cert.certificate_code}</td>
              <td class="p-2">{cert.certificate_name}</td>
              <td class="p-2">{cert.hours}</td>
              <td class="p-2 text-center">
                <span class="px-3 py-1 text-white rounded {cert.is_active ? 'bg-green-500' : 'bg-orange-500'}">
                  {cert.is_active ? "เปิด" : "ปิด"}
                </span>
              </td>
              <td class="p-2 text-center space-x-2">
                <button on:click={() => openEditModal(cert)} class="text-blue-500 hover:text-blue-700">
                  <Pencil size="18" />
                </button>
                <button on:click={() => deleteCertificate(cert.certificate_type_id)} class="text-red-500 hover:text-red-700">
                  <Trash size="18" />
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
