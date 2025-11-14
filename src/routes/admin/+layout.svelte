<script lang="ts">
	import { page } from '$app/stores';
	import {
		LayoutDashboard,
		Link2,
		AlertTriangle,
		Users,
		Shield,
		Settings,
		LogOut
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data, children }: { data: PageData; children: import('svelte').Snippet } = $props();

	const navigation = [
		{ name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
		{ name: 'Links', href: '/admin/links', icon: Link2 },
		{ name: 'Reports', href: '/admin/reports', icon: AlertTriangle },
		{ name: 'Users', href: '/admin/users', icon: Users },
		{ name: 'Appeals', href: '/admin/appeals', icon: Shield },
		{ name: 'Settings', href: '/admin/settings', icon: Settings }
	];

	function isActive(path: string): boolean {
		const currentPath = $page.url.pathname;
		if (path === '/admin') {
			return currentPath === '/admin';
		}
		return currentPath === path || currentPath.startsWith(`${path}/`);
	}

	function logout() {
		document.cookie = 'admin_key=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
		window.location.href = '/';
	}
</script>

<div class="flex min-h-screen bg-[#0a0a0a] text-white">
	<aside
		class="fixed top-0 left-0 z-50 h-screen w-64 border-r border-white/5 bg-[#0f0f0f] backdrop-blur-xl"
	>
		<div class="flex h-20 items-center border-b border-white/5 px-6">
			<div class="flex items-center gap-3">
				<div
					class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-blue-500/10"
				>
					<LayoutDashboard class="h-4 w-4 text-blue-400" />
				</div>
				<h1 class="text-lg font-semibold tracking-tight text-white">Admin</h1>
			</div>
		</div>
		<nav class="mt-2 space-y-1 p-4">
			{#each navigation as item}
				<a
					href="{item.href}?key={data.adminKey}"
					class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 {isActive(
						item.href
					)
						? 'border border-white/10 bg-white/5 text-white'
						: 'text-gray-400 hover:translate-x-1 hover:bg-white/5 hover:text-white'}"
				>
					{#each [item] as { icon: Icon }}
						<Icon
							class="h-4.5 w-4.5 {isActive(item.href)
								? 'text-blue-400'
								: 'text-gray-500 group-hover:text-gray-300'}"
						/>
					{/each}
					<span class="flex-1">{item.name}</span>
					{#if isActive(item.href)}
						<div class="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
					{/if}
				</a>
			{/each}
		</nav>
		<div
			class="absolute right-0 bottom-0 left-0 border-t border-white/5 bg-[#0a0a0a]/50 p-4 backdrop-blur-sm"
		>
			<button
				onclick={logout}
				class="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
			>
				<LogOut class="h-4.5 w-4.5 text-gray-500 transition-colors group-hover:text-red-400" />
				<span>Logout</span>
			</button>
		</div>
	</aside>

	<main class="ml-64 min-h-screen flex-1 bg-[#0a0a0a]">
		<div class="mx-auto max-w-7xl p-8">
			{@render children()}
		</div>
	</main>
</div>
