<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import UiPanel from './UiPanel.vue'

type DropdownMenuItem = {
  id: string
  label: string
  to?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}

const props = withDefaults(
  defineProps<{
    userName: string
    avatarUrl?: string | null
    items: DropdownMenuItem[]
    busyItemId?: string | null
  }>(),
  {
    avatarUrl: null,
    busyItemId: null
  }
)

const emit = defineEmits<{
  select: [itemId: string]
}>()

const menuRoot = ref<HTMLElement | null>(null)
const toggleButton = ref<HTMLButtonElement | null>(null)
const isOpen = ref(false)

const avatarInitials = computed(() => {
  const nameParts = props.userName.trim().split(/\s+/).filter(Boolean)
  const firstName = nameParts[0]
  const secondName = nameParts[1]

  if (!firstName) {
    return '?'
  }

  if (!secondName) {
    return firstName.slice(0, 1).toUpperCase()
  }

  return `${firstName.slice(0, 1)}${secondName.slice(0, 1)}`.toUpperCase()
})

const openMenu = () => {
  isOpen.value = true
}

const closeMenu = () => {
  isOpen.value = false
}

const toggleMenu = () => {
  isOpen.value = !isOpen.value
}

const onFocusOut = (event: FocusEvent) => {
  const nextTarget = event.relatedTarget

  if (!(nextTarget instanceof Node) || !menuRoot.value?.contains(nextTarget)) {
    closeMenu()
  }
}

const onDocumentPointerDown = (event: Event) => {
  const target = event.target

  if (!(target instanceof Node) || !menuRoot.value?.contains(target)) {
    closeMenu()
  }
}

const onEscape = (event: KeyboardEvent) => {
  if (event.key !== 'Escape') {
    return
  }

  closeMenu()
  toggleButton.value?.focus()
}

const onActionSelect = (itemId: string) => {
  emit('select', itemId)
  closeMenu()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
})
</script>

<template>
  <div
    ref="menuRoot"
    class="dropdown-root"
    @mouseenter="openMenu"
    @mouseleave="closeMenu"
    @focusout="onFocusOut"
    @keydown="onEscape"
  >
    <button
      ref="toggleButton"
      type="button"
      class="dropdown-toggle"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="menu"
      aria-label="Abrir menu da conta"
      @click="toggleMenu"
      @focus="openMenu"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="`Avatar de ${userName}`"
        class="avatar-image"
        width="48"
        height="48"
      />
      <span v-else class="avatar-fallback">{{ avatarInitials }}</span>
    </button>

    <transition name="dropdown-fade">
      <UiPanel
        v-if="isOpen"
        as="div"
        padding="sm"
        tone="strong"
        class="dropdown-menu"
        role="menu"
        aria-label="Acoes da conta"
      >
        <div class="dropdown-copy">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="`Avatar de ${userName}`"
            class="avatar-image"
            width="48"
            height="48"
          />
          <span v-else class="avatar-fallback">{{ avatarInitials }}</span>
          <span class="dropdown-eyebrow">Conta</span>
          <strong class="dropdown-user">{{ userName }}</strong>
        </div>

        <div class="dropdown-items">
          <template v-for="item in items" :key="item.id">
            <NuxtLink
              v-if="item.to"
              :to="item.to"
              class="dropdown-item"
              :class="{
                danger: item.tone === 'danger',
                disabled: item.disabled || busyItemId === item.id
              }"
              :aria-disabled="item.disabled || busyItemId === item.id ? 'true' : undefined"
              :tabindex="item.disabled || busyItemId === item.id ? -1 : undefined"
              role="menuitem"
              @click="closeMenu"
            >
              {{ item.label }}
            </NuxtLink>

            <button
              v-else
              type="button"
              class="dropdown-item"
              :class="{
                danger: item.tone === 'danger',
                disabled: item.disabled || busyItemId === item.id
              }"
              :disabled="item.disabled || busyItemId === item.id"
              role="menuitem"
              @click="onActionSelect(item.id)"
            >
              {{ item.label }}
            </button>
          </template>
        </div>
      </UiPanel>
    </transition>
  </div>
</template>

<style scoped>
.dropdown-root {
  position: relative;
}

.dropdown-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 3.25rem;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background:
    radial-gradient(circle at top, rgba(229, 9, 20, 0.24), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02)),
    rgba(16, 16, 16, 0.92);
  box-shadow:
    0 14px 32px rgba(0, 0, 0, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

.dropdown-toggle:hover,
.dropdown-toggle:focus-visible {
  transform: translateY(-1px);
  border-color: rgba(229, 9, 20, 0.44);
  box-shadow:
    0 0 0 4px rgba(229, 9, 20, 0.12),
    0 18px 36px rgba(0, 0, 0, 0.42);
  outline: none;
}

.avatar-image,
.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 999px;
  aspect-ratio: 1;
}

.avatar-image {
  object-fit: cover;
}

.avatar-fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--ds-text);
  background:
    radial-gradient(circle at 30% 20%, rgba(255, 255, 255, 0.16), transparent 34%),
    linear-gradient(160deg, rgba(229, 9, 20, 0.88), rgba(109, 7, 12, 0.96));
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 0.8rem);
  right: 0;
  z-index: 30;
  width: min(18rem, calc(100vw - 2rem));
  display: grid;
  gap: 0.85rem;
}

.dropdown-copy {
  display: grid;
  gap: 0.18rem;
  padding: 0.25rem 0.35rem 0;

  .avatar-fallback,
  .avatar-image {
    width: 2.5rem;
    height: 2.5rem;
    margin-bottom: 1rem;
  }
}

.dropdown-eyebrow {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  color: var(--ds-accent-strong);
}

.dropdown-user {
  font-family: 'Fraunces', serif;
  font-size: 1.02rem;
  color: var(--ds-text);
}

.dropdown-items {
  display: grid;
  gap: 0.35rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  min-height: 2.9rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 1rem;
  color: var(--ds-text);
  background: transparent;
  font-size: 0.95rem;
  font-weight: 700;
  text-decoration: none;
  text-align: left;
  cursor: pointer;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.dropdown-item:hover,
.dropdown-item:focus-visible {
  transform: translateX(2px);
  border-color: rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.05);
  outline: none;
}

.dropdown-item.danger {
  color: #ffb1b1;
}

.dropdown-item.danger:hover,
.dropdown-item.danger:focus-visible {
  border-color: rgba(229, 9, 20, 0.18);
  background: rgba(229, 9, 20, 0.08);
  color: #ffd2d2;
}

.dropdown-item.disabled {
  pointer-events: none;
  opacity: 0.56;
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (max-width: 768px) {
  .dropdown-menu {
    right: auto;
    left: 0;
  }
}
</style>
