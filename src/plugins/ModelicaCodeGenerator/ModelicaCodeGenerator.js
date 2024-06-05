/*globals define*/
/*eslint-env node, browser*/

/**
 * Generated by PluginGenerator 2.20.5 from webgme on Sat Jun 01 2024 19:59:20 GMT+0800 (中国标准时间).
 * A plugin that inherits from the PluginBase. To see source code documentation about available
 * properties and methods visit %host%/docs/source/PluginBase.html.
 */

// Requirejs dependencies / Requirejs 依赖项
define([
	'plugin/PluginConfig',
	'text!./metadata.json',
	'plugin/PluginBase'
], function (
	PluginConfig,
	pluginMetadata,
	PluginBase) {
	'use strict';

	pluginMetadata = JSON.parse(pluginMetadata);

	/**
	 * Initializes a new instance of ModelicaCodeGenerator.
	 * @class
	 * @augments {PluginBase}
	 * @classdesc This class represents the plugin ModelicaCodeGenerator.
	 * @constructor
	 */
	function ModelicaCodeGenerator() {
		// Call base class' constructor.
		PluginBase.call(this);
		this.pluginMetadata = pluginMetadata;
	}

	/**
	 * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructure etc.
	 * This is also available at the instance at this.pluginMetadata.
	 * @type {object}
	 */
	ModelicaCodeGenerator.metadata = pluginMetadata;

	// Prototypical inheritance from PluginBase.
	ModelicaCodeGenerator.prototype = Object.create(PluginBase.prototype);
	ModelicaCodeGenerator.prototype.constructor = ModelicaCodeGenerator;

	/**
	 * Main function for the plugin to execute. This will perform the execution.
	 * Notes:
	 * - Always log with the provided logger.[error,warning,info,debug].
	 * - Do NOT put any user interaction logic UI, etc. inside this method.
	 * - callback always has to be called even if error happened.
	 *
	 * @param {function(Error|null, plugin.PluginResult)} callback - the result callback
	 */
	ModelicaCodeGenerator.prototype.main = function (callback) {
		// Use this to access core, project, result, logger etc from PluginBase.
		const self = this,
			core = this.core,
			logger = this.logger,
			modelJson = {
				name: '',
				components: [],
				connections: [],
			},
			activeNode = this.activeNode;

		function atComponent (node) {
			const componentData = {
				URI: '',
				name: '',
				parameters: {},
			}
			componentData.URI = core.getAttribute(node, 'ModelicaURI')
			componentData.name = core.getAttribute(node, 'name')

			modelJson.components.push(componentData)
		}

		function atConnection (nodes, node) {
			const connData = {
				src: '',
				dst: '',
			}
			
			// Node is a connection node -> it should have two pointers src and dst.
			// th target of these are the two connected ports.
			const srcPath = core.getPointerPath(node , 'src')
			const dstPath = core.getPointerPath(node , 'dst')

			// incas there is no src or dst the connection is not wired and should be skipped.
			if (srcPath && dstPath) {
				const srcNode = nodes[srcPath] // Again we use the node-map to go from path to node
				const dstNode = nodes[dstPath]

				const srcParent = core.getParent(srcNode) // parents (and bases too) are always leaded for a node
				const dstParent = core.getParent(dstNode) // so no need to use the node-map here

				// to get the modelica path to the port inside a component there names are concatenated, e.g.
				// Ground.p
				connData.src = core.getAttribute(srcParent, 'name') + ',' + core.getAttribute(srcNode, 'name')
				connData.dst = core.getAttribute(dstParent, 'name') + ',' + core.getAttribute(dstNode, 'name')

				modelJson.connections.push(connData)
			}
		}

		function getMoFileContent() {
			let moFile = `model ${modelJson.name}`

			modelJson.components.forEach(data => {
				moFile += `\n ${data.URI} ${data.name};`
			})

			moFile += '\nequation'

			modelJson.connections.forEach(data => {
				moFile += `\n connect(${data.src}, ${data.dst});`
			})

			moFile += `\nend ${modelJson.name};`

			return moFile
		}

		// Preload the sub-tree from activeNode (all chinldren from the circuits)
		self.loadNodeMap(this.activeNode)
			.then((nodes) => {
				let nodePath, node

				for (nodePath in nodes) {
					self.logger.info(self.core.getAttribute(nodes[nodePath], 'name'), 'has path', nodePath)
				}

				modelJson.name = core.getAttribute(activeNode, 'name')

				// Get all the children paths of the activeNode
				const childrenPaths = core.getChildrenPaths(activeNode)
				for (let i = 0; i < childrenPaths.length; i++) {
					node = nodes[childrenPaths[i]] // using the node mpa loaded above
					if (self.isMetaTypeOf(node, self.META.Component)) {
						atComponent(node)
					} else if (self.isMetaTypeOf(node, self.META.Connection)) {
						atConnection(nodes, node)
					}
				}

				logger.info('extracted data: \n', JSON.stringify(modelJson, null, 2))

				const moFileContent = getMoFileContent()

				console.log('aaaaaaaa', moFileContent)

				return self.blobClient.putFile(`${modelJson.name}.mo`, moFileContent)
			})
			.then(metadataHash => {
				self.result.addArtifact(metadataHash)
				self.result.setSuccess(true);
				callback(null, self.result);
			})
			.catch((err) => {
					// Result success is false at invocation.
					self.logger.error(err.stack);
					callback(err, self.result);
			});
	};

	return ModelicaCodeGenerator;
});
