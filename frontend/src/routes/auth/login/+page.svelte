<script>
  import { login } from "../../../api.js";
  import { goto } from "$app/navigation"; // ✅ ใช้ goto() แทน window.location.href

  let username = "";
  let password = "";
  
  async function handleLogin() {
    const res = await login(username, password);

    if (res.token) {
      // ✅ เก็บ Token ใน localStorage
      localStorage.setItem("token", res.token);
      localStorage.setItem("role", res.role);
      
      // ✅ หลังจาก Login สำเร็จ Redirect ไปหน้า Dashboard
      goto("/app/dashboard");
    } else {
      alert(res.error || "Login failed!");
    }
  }
</script>


<div class="flex items-center justify-center min-h-screen bg-gray-100">
  <div class="card w-96 bg-white shadow-lg p-6 rounded-lg">
    <h1 class="text-xl font-bold text-center mb-4">Login</h1>
    <form class="space-y-4" on:submit|preventDefault={handleLogin}>
      <div class="form-control">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="label">
          <span class="label-text">Username</span>
        </label>
        <input type="text" class="input input-bordered w-full" bind:value={username} required />
      </div>
      <div class="form-control">
        <!-- svelte-ignore a11y-label-has-associated-control -->
        <label class="label">
          <span class="label-text">Password</span>
        </label>
        <input type="password" class="input input-bordered w-full" bind:value={password} required />
      </div>
      <button type="submit" class="btn btn-primary w-full">Login</button>
    </form>
  </div>
</div>
