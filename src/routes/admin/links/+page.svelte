<script lang="ts">
	import { Link2, Search, Trash2, ExternalLink } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state(data.search || '');
	let isDeleting = $state<string | null>(null);

	const adminKey = $derived($page.url.searchParams.get('key') || '');

	function handleSearch() {
		const url = new URL(window.location.href);
		if (searchQuery) {
			url.searchParams.set('search', searchQuery);
		} else {
			url.searchParams.delete('search');
		}
		url.searchParams.set('page', '1');
		window.location.href = url.toString();
	}

	async function deleteLink(shortCode: string) {
		if (!confirm(`Are you sure you want to delete link ${shortCode}?`)) {
			return;
		}

		isDeleting = shortCode;
		try {
			const response = await fetch(`/api/admin/links/${shortCode}?key=${adminKey}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete link');
			}

			toast.success('Link deleted', {
				description: 'The short link has been removed'
			});
			window.location.reload();
		} catch (error) {
			toast.error('Failed to delete link', {
				description: error instanceof Error ? error.message : 'Please try again'
			});
		} finally {
			isDeleting = null;
		}
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString();
	}

	function formatUrl(url: string, maxLength = 50): string {
		if (url.length <= maxLength) return url;
		return url.substring(0, maxLength - 3) + '...';
	}
</script>

<div class="space-y-8">
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-white/5 pb-6">
		<div class="flex items-center gap-4">
			<div
				class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-blue-500/10"
			>
				<Link2 class="h-6 w-6 text-blue-400" />
			</div>
			<div>
				<h1 class="text-3xl font-semibold tracking-tight text-white">Links Management</h1>
				<p class="mt-1 text-sm text-gray-500">Manage all shortened URLs</p>
			</div>
		</div>
	</div>

	<!-- Search -->
	<div class="flex gap-3">
		<div class="relative flex-1">
			<Search class="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
			<Input
				bind:value={searchQuery}
				placeholder="Search by short code or URL..."
				class="h-12 border-white/10 bg-white/5 pl-11 text-white transition-all placeholder:text-gray-500 focus:border-blue-500/30 focus:bg-white/10"
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
			/>
		</div>
		<Button
			onclick={handleSearch}
			class="h-12 border-0 bg-blue-500 px-6 text-white hover:bg-blue-600"
		>
			Search
		</Button>
	</div>

	<!-- Links Table -->
	<div class="overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] backdrop-blur-sm">
		<div class="overflow-x-auto">
			<table class="w-full">
				<thead class="border-b border-white/5 bg-white/5">
					<tr>
						<th
							class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
							>Short Code</th
						>
						<th
							class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
							>Original URL</th
						>
						<th
							class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
							>Clicks</th
						>
						<th
							class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
							>Created</th
						>
						<th
							class="px-6 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
							>Actions</th
						>
					</tr>
				</thead>
				<tbody class="divide-y divide-white/5">
					{#each data.links as link}
						<tr class="group transition-colors duration-200 hover:bg-white/5">
							<td class="px-6 py-4">
								<code
									class="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-1 font-mono text-sm font-medium text-blue-400"
									>{link.shortCode}</code
								>
							</td>
							<td class="px-6 py-4">
								<div class="flex items-center gap-3">
									<span class="max-w-md truncate text-sm font-medium text-gray-300">
										{formatUrl(link.originalUrl)}
									</span>
									<a
										href={link.originalUrl}
										target="_blank"
										rel="noopener noreferrer"
										class="flex-shrink-0 text-gray-500 transition-colors hover:text-blue-400"
									>
										<ExternalLink class="h-4 w-4" />
									</a>
								</div>
							</td>
							<td class="px-6 py-4">
								<span
									class="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-white"
								>
									{link.analytics?.clicks || 0}
								</span>
							</td>
							<td class="px-6 py-4 text-sm text-gray-400">
								{formatDate(link.createdAt)}
							</td>
							<td class="px-6 py-4">
								<button
									onclick={() => deleteLink(link.shortCode)}
									disabled={isDeleting === link.shortCode}
									class="rounded-lg p-2 text-red-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
								>
									<Trash2 class="h-4 w-4" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Pagination -->
	{#if data.total > 50}
		<div class="flex items-center justify-between pt-4">
			<p class="text-sm text-gray-500">
				Showing <span class="font-medium text-white">{(data.page - 1) * 50 + 1}</span> to
				<span class="font-medium text-white">{Math.min(data.page * 50, data.total)}</span>
				of <span class="font-medium text-white">{data.total}</span>
			</p>
			<div class="flex gap-2">
				{#if data.page > 1}
					<a
						href="/admin/links?key={adminKey}&page={data.page - 1}{data.search
							? `&search=${data.search}`
							: ''}"
						class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10"
					>
						Previous
					</a>
				{/if}
				{#if data.page * 50 < data.total}
					<a
						href="/admin/links?key={adminKey}&page={data.page + 1}{data.search
							? `&search=${data.search}`
							: ''}"
						class="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-all duration-200 hover:border-white/20 hover:bg-white/10"
					>
						Next
					</a>
				{/if}
			</div>
		</div>
	{/if}
</div>
