<template>
  <main class="auth-layout page-shell">
    <slot />
  </main>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem 0;
}
</style>

