<script lang="ts">
	import { AlertTriangle, Check, X, ExternalLink } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { toast } from 'svelte-sonner';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const adminKey = $derived($page.url.searchParams.get('key') || '');

	async function resolveReport(reportId: string, action: 'approve' | 'reject') {
		try {
			const response = await fetch(
				`/api/admin/reports/${reportId}?key=${adminKey}&action=${action}`,
				{
					method: 'POST'
				}
			);

			if (!response.ok) {
				throw new Error('Failed to resolve report');
			}

			toast.success(`Report ${action === 'approve' ? 'approved' : 'rejected'}`, {
				description: `The report has been ${action === 'approve' ? 'approved' : 'rejected'}`
			});
			window.location.reload();
		} catch (error) {
			toast.error('Failed to resolve report', {
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
			class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-amber-500/10"
		>
			<AlertTriangle class="h-6 w-6 text-amber-400" />
		</div>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-white">Reports Management</h1>
			<p class="mt-1 text-sm text-gray-500">Review and resolve URL reports</p>
		</div>
	</div>

	{#if data.reports.length === 0}
		<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-12 text-center backdrop-blur-sm">
			<div class="flex flex-col items-center gap-4">
				<div
					class="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10"
				>
					<AlertTriangle class="h-8 w-8 text-amber-400" />
				</div>
				<p class="font-medium text-gray-400">No pending reports</p>
			</div>
		</div>
	{:else}
		<div class="space-y-4">
			{#each data.reports as report}
				<div
					class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/20"
				>
					<div class="flex items-start justify-between gap-6">
						<div class="min-w-0 flex-1">
							<div class="mb-3 flex items-center gap-3">
								<code
									class="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 font-mono text-sm font-medium text-amber-400"
									>{report.shortCode}</code
								>
								<a
									href={report.link?.originalUrl}
									target="_blank"
									rel="noopener noreferrer"
									class="text-gray-500 transition-colors hover:text-amber-400"
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							</div>
							<div class="mb-3">
								<p class="mb-1 text-sm font-semibold text-white">Reason</p>
								<p class="text-sm text-gray-300">{report.reason}</p>
							</div>
							{#if report.description}
								<div class="mb-3">
									<p class="mb-1 text-xs font-medium tracking-wider text-gray-500 uppercase">
										Description
									</p>
									<p class="text-sm text-gray-400">{report.description}</p>
								</div>
							{/if}
							<div class="flex items-center gap-2 text-xs text-gray-500">
								<span>Reported by</span>
								<code class="text-gray-400">{report.reporterIp}</code>
								<span>•</span>
								<span>{formatDate(report.createdAt)}</span>
							</div>
						</div>
						<div class="flex flex-shrink-0 gap-2">
							<Button
								onclick={() => resolveReport(report.id, 'approve')}
								class="border-0 bg-green-500 text-white hover:bg-green-600"
							>
								<Check class="mr-2 h-4 w-4" />
								Approve
							</Button>
							<Button
								onclick={() => resolveReport(report.id, 'reject')}
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
