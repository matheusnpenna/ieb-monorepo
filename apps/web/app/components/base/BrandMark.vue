<script setup lang="ts">
const props = withDefaults(
  defineProps<{ 
    mode?: 'icon' | 'full';
    to?: string;
  }>(), 
  {
    mode: 'full',
    to: '/'
  }
);
</script>
<template>
  <NuxtLink
    :to="props.to"
    class="brand-mark"
    aria-label="Comunidade Videira, Instituto Eurico Bergsten"
  >
    <img
      src="/brand/mark.svg"
      alt=""
      class="brand-symbol"
      :class="{ full: props.mode === 'full' }"
      width="56"
      height="56"
      loading="eager"
      decoding="async"
    />
    <span v-if="props.mode === 'full'" class="brand-copy">
      <span class="brand-eyebrow">Instituto Eurico Bergsten</span>
      <strong class="brand-title"><small>Comunidade Videira</small></strong>
    </span>
  </NuxtLink>
</template>

<style scoped>
.brand-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.85rem;

  &.full {
    padding: 0.65rem 1rem 0.65rem 0.7rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02)),
      rgba(12, 12, 12, 0.78);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.24);
    backdrop-filter: blur(16px);
    transition:
      transform 180ms ease,
      border-color 180ms ease,
      background-color 180ms ease;
  }
}

.brand-mark.full:hover {
  transform: translateY(-1px);
  border-color: rgba(255, 255, 255, 0.16);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
    rgba(15, 15, 15, 0.82);
}

.brand-mark.full:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 4px rgba(229, 9, 20, 0.18),
    0 18px 40px rgba(0, 0, 0, 0.24);
}

.brand-symbol {
  flex: none;
  width: 3.5rem;
  height: 3.5rem;
  filter: drop-shadow(0 10px 22px rgba(229, 9, 20, 0.2));
}

.brand-copy {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

.brand-eyebrow {
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--ds-accent-strong);
}

.brand-title {
  font-family: 'Fraunces', serif;
  font-size: clamp(1.1rem, 1.4vw, 1.35rem);
  line-height: 0.98;
  letter-spacing: -0.05em;
  color: var(--ds-text);
  text-wrap: balance;
}

@media (max-width: 640px) {
  .brand-mark {
    gap: 0.7rem;
    padding-right: 0.85rem;
  }

  .brand-symbol {
    width: 3rem;
    height: 3rem;
  }

  .brand-eyebrow {
    font-size: 0.62rem;
    letter-spacing: 0.22em;
  }

  .brand-title {
    font-size: 1.02rem;
  }
}
</style>
