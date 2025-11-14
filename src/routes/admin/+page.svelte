<script lang="ts">
	import {
		LayoutDashboard,
		Link2,
		MousePointer,
		Users,
		Ban,
		AlertTriangle,
		Shield
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const stats = data.stats;
	const activity = data.activity;
</script>

<div class="space-y-8">
	<div class="flex items-center gap-4 border-b border-white/5 pb-6">
		<div
			class="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-blue-500/10"
		>
			<LayoutDashboard class="h-6 w-6 text-blue-400" />
		</div>
		<div>
			<h1 class="text-3xl font-semibold tracking-tight text-white">Dashboard</h1>
			<p class="mt-1 text-sm text-gray-500">System overview and statistics</p>
		</div>
	</div>

	{#if stats}
		<div class="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
			<div
				class="group relative rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/20"
			>
				<div class="mb-4 flex items-start justify-between">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10"
					>
						<Link2 class="h-6 w-6 text-blue-400" />
					</div>
				</div>
				<div>
					<p class="mb-1 text-3xl font-bold text-white">{stats.totalUrls.toLocaleString()}</p>
					<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Total URLs</p>
				</div>
			</div>

			<div
				class="group relative rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-green-500/20"
			>
				<div class="mb-4 flex items-start justify-between">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl border border-green-500/20 bg-green-500/10"
					>
						<MousePointer class="h-6 w-6 text-green-400" />
					</div>
				</div>
				<div>
					<p class="mb-1 text-3xl font-bold text-white">{stats.totalClicks.toLocaleString()}</p>
					<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Total Clicks</p>
				</div>
			</div>

			<div
				class="group relative rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/20"
			>
				<div class="mb-4 flex items-start justify-between">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10"
					>
						<Users class="h-6 w-6 text-purple-400" />
					</div>
				</div>
				<div>
					<p class="mb-1 text-3xl font-bold text-white">{stats.activeUsers.toLocaleString()}</p>
					<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Active Users</p>
				</div>
			</div>

			<div
				class="group relative rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm transition-all duration-300 hover:border-red-500/20"
			>
				<div class="mb-4 flex items-start justify-between">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10"
					>
						<Ban class="h-6 w-6 text-red-400" />
					</div>
				</div>
				<div>
					<p class="mb-1 text-3xl font-bold text-white">{stats.blockedIps.toLocaleString()}</p>
					<p class="text-xs font-medium tracking-wider text-gray-500 uppercase">Blocked IPs</p>
				</div>
			</div>
		</div>

		{#if stats.pendingReports > 0 || stats.pendingAppeals > 0 || stats.pendingIpAppeals > 0}
			<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
				{#if stats.pendingReports > 0}
					<a
						href="/admin/reports?key={data.adminKey}"
						class="group rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/10"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20"
							>
								<AlertTriangle class="h-5 w-5 text-amber-400" />
							</div>
							<div>
								<p class="mb-0.5 text-2xl font-bold text-white">{stats.pendingReports}</p>
								<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">
									Pending Reports
								</p>
							</div>
						</div>
					</a>
				{/if}

				{#if stats.pendingAppeals > 0}
					<a
						href="/admin/appeals?key={data.adminKey}"
						class="group rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-blue-500/30 hover:bg-blue-500/10"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/20"
							>
								<Shield class="h-5 w-5 text-blue-400" />
							</div>
							<div>
								<p class="mb-0.5 text-2xl font-bold text-white">{stats.pendingAppeals}</p>
								<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">
									URL Appeals
								</p>
							</div>
						</div>
					</a>
				{/if}

				{#if stats.pendingIpAppeals > 0}
					<a
						href="/admin/appeals?key={data.adminKey}"
						class="group rounded-2xl border border-purple-500/20 bg-purple-500/5 p-5 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/30 hover:bg-purple-500/10"
					>
						<div class="flex items-center gap-4">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/30 bg-purple-500/20"
							>
								<Shield class="h-5 w-5 text-purple-400" />
							</div>
							<div>
								<p class="mb-0.5 text-2xl font-bold text-white">{stats.pendingIpAppeals}</p>
								<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">IP Appeals</p>
							</div>
						</div>
					</a>
				{/if}
			</div>
		{/if}

		{#if activity}
			<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-6 backdrop-blur-sm">
				<h2 class="mb-6 text-xl font-semibold text-white">Recent Activity</h2>
				<div class="space-y-4">
					{#if activity.recentLinks && activity.recentLinks.length > 0}
						<div>
							<h3 class="mb-4 text-sm font-medium tracking-wider text-gray-400 uppercase">
								Recent Links
							</h3>
							<div class="space-y-2">
								{#each activity.recentLinks.slice(0, 5) as link}
									<div
										class="group flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4 transition-all duration-200 hover:border-white/10 hover:bg-white/10"
									>
										<div class="min-w-0 flex-1">
											<p class="mb-1 truncate text-sm font-medium text-white">{link.originalUrl}</p>
											<p class="font-mono text-xs text-gray-500">{link.shortCode}</p>
										</div>
										<div class="ml-4 text-xs whitespace-nowrap text-gray-500">
											{new Date(link.createdAt).toLocaleDateString()}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	{:else}
		<div class="rounded-2xl border border-white/5 bg-[#0f0f0f] p-8 text-center backdrop-blur-sm">
			<p class="text-gray-400">Failed to load dashboard data</p>
		</div>
	{/if}
</div>
