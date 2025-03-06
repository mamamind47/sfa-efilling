<script>
    import { onMount } from "svelte";
    import { API_BASE_URL } from "$lib/api";
    import { CalendarPlus, Pencil, X } from "lucide-svelte";

    let academicYears = [];
    let year_name = "";
    let start_date = "";
    let end_date = "";
    let isCreating = false;
    let isLoading = true;

    // Modal แก้ไข
    let isModalOpen = false;
    let selectedYear = null;
    let editYearName = "";
    let editStartDate = "";
    let editEndDate = "";
    let editStatus = "";

    // ✅ โหลดปีการศึกษาจาก API
    async function fetchAcademicYears() {
        try {
            const res = await fetch(`${API_BASE_URL}/academic`);
            academicYears = await res.json();
        } catch (error) {
            console.error("❌ Error fetching academic years:", error);
        } finally {
            isLoading = false;
        }
    }

    // ✅ สร้างปีการศึกษาใหม่
    async function createAcademicYear() {
        if (!year_name || !start_date || !end_date) {
            alert("กรุณากรอกข้อมูลให้ครบถ้วน");
            return;
        }

        isCreating = true;
        try {
            const res = await fetch(`${API_BASE_URL}/academic`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    year_name,
                    start_date,
                    end_date,
                    status: null // ค่าเริ่มต้นเป็น null
                }),
            });

            if (res.ok) {
                await fetchAcademicYears();
                year_name = "";
                start_date = "";
                end_date = "";
            } else {
                alert("❌ สร้างปีการศึกษาไม่สำเร็จ");
            }
        } catch (error) {
            console.error("❌ Error creating academic year:", error);
        } finally {
            isCreating = false;
        }
    }

    // ✅ เปิด Modal พร้อมโหลดข้อมูล
    function openModal(year) {
        selectedYear = { ...year };
        editYearName = year.year_name;
        editStartDate = year.start_date.split("T")[0]; // แปลงวันที่ให้เป็น YYYY-MM-DD
        editEndDate = year.end_date.split("T")[0];
        editStatus = year.status ?? "";
        isModalOpen = true;
    }

    // ✅ ปิด Modal
    function closeModal() {
        isModalOpen = false;
        selectedYear = null;
    }

    // ✅ อัปเดตปีการศึกษา (ชื่อ, วันเริ่มต้น, วันสิ้นสุด, สถานะ)
    async function updateAcademicYear() {
        try {
            const res = await fetch(`${API_BASE_URL}/academic/${selectedYear.academic_year_id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    year_name: editYearName,
                    start_date: editStartDate,
                    end_date: editEndDate,
                    status: editStatus === "" ? null : editStatus,
                }),
            });

            if (res.ok) {
                await fetchAcademicYears();
                closeModal();
            } else {
                alert("❌ อัปเดตปีการศึกษาไม่สำเร็จ");
            }
        } catch (error) {
            console.error("❌ Error updating academic year:", error);
        }
    }

    // ✅ โหลดข้อมูลเมื่อเปิดหน้า
    onMount(fetchAcademicYears);
</script>

<style>
    th, td {
        color: black;
    }

    /* ✅ สไตล์ Modal */
    .modal-bg {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .modal-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        width: 400px;
    }
</style>

<div class="p-6">
    <h1 class="text-2xl font-bold mb-4 flex items-center space-x-2 text-black">
        <CalendarPlus class="text-orange-500" size="24" />
        <span>จัดการปีการศึกษา</span>
    </h1>

    <!-- ฟอร์มสร้างปีการศึกษา -->
    <div class="bg-white p-4 rounded-lg shadow-md mb-6">
        <h2 class="text-lg font-semibold mb-2 text-black">เพิ่มปีการศึกษา</h2>
        <div class="grid grid-cols-3 gap-4">
            <div>
                <label for="year_name" class="block text-gray-700 mb-1">ชื่อปีการศึกษา</label>
                <input id="year_name" type="text" placeholder="เช่น 2567" bind:value={year_name} class="p-2 border rounded text-black w-full" pattern="\d{4}" inputmode="numeric" on:input={(e) => year_name = e.target.value.replace(/\D/g, '')} required />
            </div>

            <div>
                <label for="start_date" class="block text-gray-700 mb-1">วันเริ่มต้น</label>
                <input id="start_date" type="date" bind:value={start_date} class="p-2 border rounded text-black w-full" required />
            </div>

            <div>
                <label for="end_date" class="block text-gray-700 mb-1">วันสิ้นสุด</label>
                <input id="end_date" type="date" bind:value={end_date} class="p-2 border rounded text-black w-full" required />
            </div>

            <button on:click={createAcademicYear} class="col-span-3 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition">
                {isCreating ? "กำลังสร้าง..." : "เพิ่มปีการศึกษา"}
            </button>
        </div>
    </div>

    <!-- ตารางแสดงปีการศึกษา -->
    {#if isLoading}
        <p class="text-center text-black">กำลังโหลดข้อมูล...</p>
    {:else if academicYears.length === 0}
        <p class="text-center text-gray-500">ยังไม่มีข้อมูลปีการศึกษา</p>
    {:else}
        <div class="bg-white p-4 rounded-lg shadow-md">
            <table class="w-full border-collapse">
                <thead class="bg-gray-200">
                    <tr>
                        <th class="p-2 text-left">ปีการศึกษา</th>
                        <th class="p-2 text-left">วันเริ่มต้น</th>
                        <th class="p-2 text-left">วันสิ้นสุด</th>
                        <th class="p-2 text-center">สถานะ</th>
                        <th class="p-2 text-center">จัดการ</th>
                    </tr>
                </thead>
                <tbody>
                    {#each academicYears as year}
                        <tr class="border-b">
                            <td class="p-2">{year.year_name}</td>
                            <td class="p-2">{new Date(year.start_date).toLocaleDateString()}</td>
                            <td class="p-2">{new Date(year.end_date).toLocaleDateString()}</td>
                            <td class="p-2 text-center">
                                <span class="px-3 py-1 text-white rounded 
                                    {year.status === 'OPEN' || (year.status === null && new Date(year.start_date) <= new Date() && new Date() <= new Date(year.end_date)) 
                                    ? 'bg-green-500' 
                                    : 'bg-orange-500'}">
                                    {year.status === "OPEN" ? "เปิด" : year.status === "CLOSED" ? "ปิด" : (new Date(year.start_date) <= new Date() && new Date() <= new Date(year.end_date)) ? "เปิด (ตามกำหนดเวลา)" : "ปิด (ตามกำหนดเวลา)"}
                                </span>
                            </td>
                            <td class="p-2 text-center">
                                <button on:click={() => openModal(year)} class="text-blue-500 hover:text-blue-700">
                                    <Pencil size="18" />
                                </button>
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    {/if}

    <!-- Modal แก้ไข -->
<!-- Modal แก้ไข -->
{#if isModalOpen}
    <div class="modal-bg">
        <div class="modal-content">
            <h2 class="text-lg font-semibold text-black mb-4">แก้ไขปีการศึกษา <span class="font-bold">{editYearName}</span></h2>
            
            <!-- ✅ Label + Input: ชื่อปีการศึกษา -->
            <label for="editYearName" class="block text-gray-700 mb-1">ชื่อปีการศึกษา</label>
            <input id="editYearName" type="text" bind:value={editYearName} class="p-2 border rounded w-full text-black mb-3" />

            <!-- ✅ Label + Input: วันเริ่มต้น -->
            <label for="editStartDate" class="block text-gray-700 mb-1">วันเริ่มต้น</label>
            <input id="editStartDate" type="date" bind:value={editStartDate} class="p-2 border rounded w-full text-black mb-3" />

            <!-- ✅ Label + Input: วันสิ้นสุด -->
            <label for="editEndDate" class="block text-gray-700 mb-1">วันสิ้นสุด</label>
            <input id="editEndDate" type="date" bind:value={editEndDate} class="p-2 border rounded w-full text-black mb-3" />

            <!-- ✅ Label + Dropdown: สถานะ -->
            <label for="editStatus" class="block text-gray-700 mb-1">สถานะ</label>
            <select id="editStatus" bind:value={editStatus} class="w-full p-2 border rounded text-black mb-3">
                <option value="">ตามเวลาที่ตั้ง</option>
                <option value="OPEN">เปิด</option>
                <option value="CLOSED">ปิด</option>
            </select>

            <!-- ✅ ปุ่มบันทึก & ยกเลิก -->
            <div class="flex justify-end space-x-2 mt-4">
                <button on:click={closeModal} class="px-4 py-2 border border-gray-400 rounded text-gray-700 hover:bg-gray-100 transition">
                    ยกเลิก
                </button>
                <button on:click={updateAcademicYear} class="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition">
                    บันทึก
                </button>
            </div>
        </div>
    </div>
{/if}

</div>
