<script>
	let files, width, chars
	let generated = false, err = false
	let art = ""
	let textSize = 15

	var clipboard = new ClipboardJS('.copy');

	function sendForm() {
		// console.log(files[0], width, chars);
		var formData = new FormData();
		textSize = Math.floor(1500/width)
		// err = false

		formData.append("image", files[0]);
		formData.append("width", width);
		formData.append("charset", chars);

		var request = new XMLHttpRequest();
		request.open("POST", "https://us-central1-pix2ascii.cloudfunctions.net/ascii");
		request.send(formData);
		request.onreadystatechange = function () {
		if(request.readyState === XMLHttpRequest.DONE) {
			var status = request.status;
			if (status === 0 || (status >= 200 && status < 400)) {
			err = false
			art = request.responseText
			generated = true
			} else {
			err = true
			console.log("Error");
			
			}
		}
		};
		
	}
</script>

<div class="terminal-nav">
	<div class="terminal-logo">
	<h3>
		<div class="logo terminal-prompt"><a href="/" class="no-style">Pix 2 Ascii</a></div>
	</h3>
	</div>
	<nav class="terminal-menu">
	<ul>
		<li><a class="menu-item" href="https://github.com/Aveek-Saha/pix2ascii"><h3>#GitHub</h3></a></li>
		<!-- <li><a class="menu-item" href="https://home.aveek.io"><h2>#Portfolio</h2></a></li> -->
	</ul>
	</nav>
</div>

<div class="container">
	
	<div class="row">
	{#if !generated}
		<div class="column column-25"></div>
		<div class="column column-50">
				<fieldset>
				<legend>Upload Image</legend>
				<div class="form-group">
					<label for="file">Pick an image &lt 5mb (jpg, png, bmp):</label>
					<input id="file" name="file" bind:files={files} type="file">
				</div>
				<div class="form-group">
					<label for="width">Number of characters in a row:</label>
					<input id="width" name="width" type="number" bind:value={width}
					min="100" max="500" placeholder="Range: 100 - 500">
				</div>
				<div class="form-group">
					<label for="select">Characterset: </label>
					<select id="select" name="select" bind:value={chars} >
					<option value="gscale_70"> Grayscale 70 </option>
					<option value="gscale_10"> Grayscale 10 </option>
					<option value="gscale_block"> Blocks </option>

					</select>
				</div>
				{#if files!== undefined && width < 501 && width > 99 && chars!== ""}
					<button class="btn btn-primary"
					on:click={sendForm}>Generate</button>
				{:else}
					<button class="btn btn-error btn-ghost" disabled>Generate</button>
				{/if}

					
				</fieldset>
			{#if err}
				<br>
				<br>
				<div class="terminal-alert terminal-alert-error">
					Problem uploading image, check the file size, format or number of characters and try again.
				</div>
			{/if}
		</div>
		{:else}

		<div class="column column-20"></div>
		<div class="column column-60">
			<form>
				<fieldset>
				<legend>ASCII Art</legend>
				<div style="font-size:{textSize}px; line-height: {textSize}px; font-family: monospace; white-space: pre-line;">
					{art}
				</div>
				</fieldset>
			</form>
			
			<br>
		</div>
		<div class="column column-20">
		<br>
			<button class="btn btn-default copy" data-clipboard-text={art}>
				Copy
			</button>
		<br>
		<br>
			<a class="btn btn-default" href="/">
				Go back
			</a>
		</div>
		{/if}
	</div>
</div>
<br>


<!-- <div class="row end-lg end-m end-s">
    
</div> -->

<style>
</style>