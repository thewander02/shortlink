<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
<Toaster
	position="bottom-center"
	theme="dark"
	toastOptions={{
		classes: {
			toast:
				'group toast group-[.toaster]:bg-card/95 group-[.toaster]:backdrop-blur-md group-[.toaster]:border-border group-[.toaster]:text-card-foreground group-[.toaster]:rounded-xl group-[.toaster]:shadow-lg',
			description: 'group-[.toast]:text-muted-foreground',
			actionButton:
				'group-[.toast]:bg-primary/10 group-[.toast]:text-primary group-[.toast]:hover:bg-primary/20',
			cancelButton:
				'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:hover:bg-muted/80'
		}
	}}
	richColors
	closeButton
/>
