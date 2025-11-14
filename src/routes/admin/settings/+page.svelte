<script lang="ts">
	import { Settings, AlertTriangle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';

	const adminKey = $derived($page.url.searchParams.get('key') || '');

	let panicMode = $state(false);
	let isLoading = $state(false);

	async function togglePanicMode() {
		isLoading = true;
		try {
			const response = await fetch(`/api/admin/settings/panic-mode?key=${adminKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabled: !panicMode })
			});

			if (!response.ok) {
				throw new Error('Failed to toggle panic mode');
			}

			panicMode = !panicMode;
			toast.success(`Panic mode ${panicMode ? 'enabled' : 'disabled'}`, {
				description: panicMode ? 'URL shortening is now disabled' : 'URL shortening is now enabled'
			});
		} catch (error) {
			toast.error('Failed to toggle panic mode', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center gap-4 border-b border-white/5 pb-6">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-gray-500/10"
		>
			<Settings class="h-6 w-6 text-gray-400" />
		</div>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-white">Settings</h1>
			<p class="mt-1 text-sm text-gray-500">System configuration and preferences</p>
		</div>
	</div>

	<div class="space-y-6">
		<div
			class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/20"
		>
			<div class="flex items-center justify-between gap-6">
				<div class="flex flex-1 items-start gap-4">
					<div
						class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10"
					>
						<AlertTriangle class="h-6 w-6 text-amber-400" />
					</div>
					<div class="flex-1">
						<h2 class="mb-2 text-lg font-semibold text-white">Panic Mode</h2>
						<p class="text-sm leading-relaxed text-gray-400">
							When enabled, URL shortening will be temporarily disabled for all users. Use this
							feature to quickly halt all link creation in emergency situations.
						</p>
					</div>
				</div>
				<div class="flex-shrink-0">
					<Switch bind:checked={panicMode} onCheckedChange={togglePanicMode} disabled={isLoading} />
				</div>
			</div>
			{#if panicMode}
				<div class="mt-4 ml-16 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
					<p class="text-xs font-medium text-amber-400">
						⚠️ Panic mode is currently active. All URL shortening is disabled.
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>
