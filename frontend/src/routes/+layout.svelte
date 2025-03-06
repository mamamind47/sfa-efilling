<script>
	import { page } from "$app/stores";
	import '../app.postcss';
  import Footer from "../components/Footer.svelte";
</script>

<!-- ✅ ใช้ flex layout -->
<div class="flex flex-col min-h-screen">
  <main class="flex-grow">
    <slot />
  </main>

  <!-- ✅ Footer จะติดล่างเสมอ -->
  <Footer />
</div>