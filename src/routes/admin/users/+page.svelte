<script lang="ts">
	import { Users, Ban, Unlock, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const adminKey = $derived($page.url.searchParams.get('key') || '');

	let showBlockForm = $state(false);
	let blockIp = $state('');
	let blockReason = $state('');
	let blockDuration = $state(24);

	async function unblockIp(ip: string) {
		if (!confirm(`Are you sure you want to unblock ${ip}?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/admin/users/unblock?key=${adminKey}&ip=${ip}`, {
				method: 'POST'
			});

			if (!response.ok) {
				throw new Error('Failed to unblock IP');
			}

			toast.success('IP unblocked', {
				description: 'The IP address has been removed from the block list'
			});
			window.location.reload();
		} catch (error) {
			toast.error('Failed to unblock IP', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		}
	}

	async function submitBlock() {
		if (!blockIp || !blockReason) {
			toast.error('Fields required', {
				description: 'Please fill in all required fields'
			});
			return;
		}

		try {
			const response = await fetch(`/api/admin/users/block?key=${adminKey}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ip: blockIp,
					reason: blockReason,
					durationHours: blockDuration
				})
			});

			if (!response.ok) {
				throw new Error('Failed to block IP');
			}

			toast.success('IP blocked', {
				description: 'The IP address has been added to the block list'
			});
			showBlockForm = false;
			blockIp = '';
			blockReason = '';
			window.location.reload();
		} catch (error) {
			toast.error('Failed to block IP', {
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
	<div class="flex items-center justify-between border-b border-white/5 pb-6">
		<div class="flex items-center gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-purple-500/10"
			>
				<Users class="h-6 w-6 text-purple-400" />
			</div>
			<div>
				<h1 class="text-3xl font-semibold tracking-tight text-white">User/IP Management</h1>
				<p class="mt-1 text-sm text-gray-500">Manage blocked IP addresses</p>
			</div>
		</div>
		<Button
			onclick={() => (showBlockForm = !showBlockForm)}
			class="h-12 border-0 bg-red-500 px-6 text-white hover:bg-red-600"
		>
			<Plus class="mr-2 h-4 w-4" />
			Block IP
		</Button>
	</div>

	{#if showBlockForm}
		<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm">
			<h2 class="mb-6 text-xl font-semibold text-white">Block IP Address</h2>
			<div class="space-y-5">
				<div>
					<label for="block-ip" class="mb-2 block text-sm font-semibold text-white"
						>IP Address</label
					>
					<Input
						id="block-ip"
						bind:value={blockIp}
						placeholder="192.168.1.1"
						class="h-12 border-white/10 bg-white/5 text-white transition-all placeholder:text-gray-500 focus:border-red-500/30 focus:bg-white/10"
					/>
				</div>
				<div>
					<label for="block-reason" class="mb-2 block text-sm font-semibold text-white"
						>Reason</label
					>
					<Textarea
						id="block-reason"
						bind:value={blockReason}
						placeholder="Reason for blocking..."
						class="border-white/10 bg-white/5 text-white transition-all placeholder:text-gray-500 focus:border-red-500/30 focus:bg-white/10"
					/>
				</div>
				<div>
					<label for="block-duration" class="mb-2 block text-sm font-semibold text-white">
						Duration (hours)
					</label>
					<Input
						id="block-duration"
						type="number"
						bind:value={blockDuration}
						min="1"
						class="h-12 border-white/10 bg-white/5 text-white transition-all placeholder:text-gray-500 focus:border-red-500/30 focus:bg-white/10"
					/>
				</div>
				<div class="flex gap-3 pt-2">
					<Button onclick={submitBlock} class="border-0 bg-red-500 text-white hover:bg-red-600">
						Block IP
					</Button>
					<Button
						onclick={() => {
							showBlockForm = false;
							blockIp = '';
							blockReason = '';
						}}
						variant="ghost"
						class="border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
					>
						Cancel
					</Button>
				</div>
			</div>
		</div>
	{/if}

	{#if data.blockedIPs.length === 0}
		<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-12 text-center backdrop-blur-sm">
			<div class="flex flex-col items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10"
				>
					<Ban class="h-8 w-8 text-red-400" />
				</div>
				<p class="font-medium text-gray-400">No blocked IPs</p>
			</div>
		</div>
	{:else}
		<div class="overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] backdrop-blur-sm">
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b border-white/5 bg-white/5">
						<tr>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>IP Address</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Reason</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Blocked At</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Expires At</th
							>
							<th
								class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
								>Actions</th
							>
						</tr>
					</thead>
					<tbody class="divide-y divide-white/5">
						{#each data.blockedIPs as ipBlock}
							<tr class="group transition-colors duration-200 hover:bg-white/5">
								<td class="px-6 py-4">
									<code
										class="rounded border border-red-500/20 bg-red-500/10 px-2 py-1 font-mono text-sm font-medium text-red-400"
										>{ipBlock.ipAddress}</code
									>
								</td>
								<td class="px-6 py-4">
									<span class="text-sm font-medium text-gray-300">{ipBlock.reason}</span>
								</td>
								<td class="px-6 py-4 text-sm text-gray-400">{formatDate(ipBlock.blockedAt)}</td>
								<td class="px-6 py-4 text-sm text-gray-400">
									{#if ipBlock.expiresAt}
										{formatDate(ipBlock.expiresAt)}
									{:else}
										<span class="text-gray-500 italic">Never</span>
									{/if}
								</td>
								<td class="px-6 py-4">
									<button
										onclick={() => unblockIp(ipBlock.ipAddress)}
										class="rounded-lg p-2 text-green-400 transition-all duration-200 hover:bg-green-500/10 hover:text-green-300"
									>
										<Unlock class="h-4 w-4" />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
