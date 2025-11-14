<script lang="ts">
	import { Shield, Check, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const adminKey = $derived($page.url.searchParams.get('key') || '');

	async function resolveAppeal(
		appealId: string,
		appealType: 'url' | 'ip',
		action: 'approve' | 'reject'
	) {
		try {
			const response = await fetch(
				`/api/admin/appeals/${appealId}?key=${adminKey}&type=${appealType}&action=${action}`,
				{
					method: 'POST'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to resolve appeal');
			}

			toast.success(`Appeal ${action === 'approve' ? 'approved' : 'rejected'}`, {
				description: `The appeal has been ${action === 'approve' ? 'approved' : 'rejected'}`
			});
			window.location.reload();
		} catch (error) {
			toast.error('Failed to resolve appeal', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		}
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleString();
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center gap-4 border-b border-white/5 pb-6">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-blue-500/10"
		>
			<Shield class="h-6 w-6 text-blue-400" />
		</div>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-white">Appeals Management</h1>
			<p class="mt-1 text-sm text-gray-500">Review and resolve URL and IP appeals</p>
		</div>
	</div>

	<!-- URL Appeals -->
	<div class="space-y-6">
		<div class="flex items-center gap-3">
			<h2 class="text-xl font-semibold text-white">URL Appeals</h2>
			<span
				class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-500"
				>{data.urlAppeals.length}</span
			>
		</div>
		{#if data.urlAppeals.length === 0}
			<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-12 text-center backdrop-blur-sm">
				<div class="flex flex-col items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10"
					>
						<Shield class="h-8 w-8 text-blue-400" />
					</div>
					<p class="font-medium text-gray-400">No pending URL appeals</p>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.urlAppeals as appeal}
					<div
						class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/20"
					>
						<div class="flex items-start justify-between gap-6">
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex items-center gap-3">
									<code
										class="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 font-mono text-sm font-medium text-blue-400"
										>{appeal.shortCode}</code
									>
								</div>
								<div class="mb-3">
									<p class="mb-1 text-sm font-semibold text-white">Reason</p>
									<p class="text-sm text-gray-300">{appeal.reason}</p>
								</div>
								{#if appeal.contactInfo}
									<div class="mb-3">
										<p class="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
											Contact
										</p>
										<p class="text-sm text-gray-400">{appeal.contactInfo}</p>
									</div>
								{/if}
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<span>Appealed by</span>
									<code class="text-gray-400">{appeal.appellantIp}</code>
									<span>•</span>
									<span>{formatDate(appeal.createdAt)}</span>
								</div>
							</div>
							<div class="flex flex-shrink-0 gap-2">
								<Button
									onclick={() => resolveAppeal(appeal.id, 'url', 'approve')}
									class="border-0 bg-green-500 text-white hover:bg-green-600"
								>
									<Check class="mr-2 h-4 w-4" />
									Approve
								</Button>
								<Button
									onclick={() => resolveAppeal(appeal.id, 'url', 'reject')}
									class="border-0 bg-red-500 text-white hover:bg-red-600"
								>
									<X class="mr-2 h-4 w-4" />
									Reject
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- IP Appeals -->
	<div class="space-y-6 border-t border-white/5 pt-8">
		<div class="flex items-center gap-3">
			<h2 class="text-xl font-semibold text-white">IP Appeals</h2>
			<span
				class="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-gray-500"
				>{data.ipAppeals.length}</span
			>
		</div>
		{#if data.ipAppeals.length === 0}
			<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-12 text-center backdrop-blur-sm">
				<div class="flex flex-col items-center gap-4">
					<div
						class="flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-500/20 bg-purple-500/10"
					>
						<Shield class="h-8 w-8 text-purple-400" />
					</div>
					<p class="font-medium text-gray-400">No pending IP appeals</p>
				</div>
			</div>
		{:else}
			<div class="space-y-4">
				{#each data.ipAppeals as appeal}
					<div
						class="rounded-2xl border border-white/5 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20"
					>
						<div class="flex items-start justify-between gap-6">
							<div class="min-w-0 flex-1">
								<div class="mb-3 flex items-center gap-3">
									<code
										class="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 font-mono text-sm font-medium text-purple-400"
										>{appeal.ipAddress}</code
									>
								</div>
								<div class="mb-3">
									<p class="mb-1 text-sm font-semibold text-white">Reason</p>
									<p class="text-sm text-gray-300">{appeal.reason}</p>
								</div>
								{#if appeal.contactInfo}
									<div class="mb-3">
										<p class="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
											Contact
										</p>
										<p class="text-sm text-gray-400">{appeal.contactInfo}</p>
									</div>
								{/if}
								<div class="flex items-center gap-2 text-xs text-gray-500">
									<span>Appealed by</span>
									<code class="text-gray-400">{appeal.appellantIp}</code>
									<span>•</span>
									<span>{formatDate(appeal.createdAt)}</span>
								</div>
							</div>
							<div class="flex flex-shrink-0 gap-2">
								<Button
									onclick={() => resolveAppeal(appeal.id, 'ip', 'approve')}
									class="border-0 bg-green-500 text-white hover:bg-green-600"
								>
									<Check class="mr-2 h-4 w-4" />
									Approve
								</Button>
								<Button
									onclick={() => resolveAppeal(appeal.id, 'ip', 'reject')}
									class="border-0 bg-red-500 text-white hover:bg-red-600"
								>
									<X class="mr-2 h-4 w-4" />
									Reject
								</Button>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
