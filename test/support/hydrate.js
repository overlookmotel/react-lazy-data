/* --------------------
 * react-lazy-data module
 * Hydrate method
 * ------------------*/

// Modules
import ReactDOM from 'react-dom';
// eslint-disable-next-line import/no-unresolved, node/no-missing-import
import {preloadData} from 'react-lazy-data';

// Exports

export default async function hydrate(element, html, dataHtml) {
	// Create div and put server-rendered HTML in it
	const container = document.createElement('div');
	container.innerHTML = html;
	document.body.appendChild(container);

	// Preload data
	const promise = preloadData();

	// Run data script
	const dataScript = dataHtml.match(/^<script>(.*)<\/script>$/)[1];
	eval(dataScript); // eslint-disable-line no-eval

	await promise;

	// Hydrate
	let rendered = false;
	ReactDOM.hydrate(element, container, () => { rendered = true; });

	// Sanity check - make sure hydration completes synchronously
	expect(rendered).toBeTrue();

	return container;
}
