import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

const CDN_URL = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/refs/heads/main/Models';
const sponza = CDN_URL + '/Sponza/glTF/Sponza.gltf';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x333333);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.update();

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// Variables to store model and GLTF data
let loadedModel = null;
let originalGltfJson = null;
let exportedGltfJson = null;

// Load the GLTF model
const loader = new GLTFLoader();
loader.load(
    sponza,
    (gltf) => {
        loadedModel = gltf.scene;
        scene.add(loadedModel);
        
        // Center the model
        const box = new THREE.Box3().setFromObject(loadedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Adjust the model position to center it
        loadedModel.position.x = -center.x;
        loadedModel.position.y = -center.y;
        loadedModel.position.z = -center.z;
        
        // Adjust camera and controls
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(0, size.y / 2, maxDim * 1.5);
        controls.target.set(0, size.y / 4, 0);
        controls.update();
        
        // Fetch the original GLTF JSON for comparison
        fetch(sponza)
            .then(response => response.json())
            .then(json => {
                originalGltfJson = json;
                console.log('Original GLTF loaded');
            });
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);

// Export the GLTF model
document.getElementById('exportBtn').addEventListener('click', () => {
    if (!loadedModel) {
        alert('Model not loaded yet!');
        return;
    }
    
    const exporter = new GLTFExporter();
    exporter.parse(
        loadedModel,
        (gltf) => {
            exportedGltfJson = gltf;
            console.log('Model exported');
            alert('Model exported successfully!');
        },
        (error) => {
            console.error('An error happened during export', error);
        },
        { binary: false }
    );
});

// Compare original and exported GLTF
document.getElementById('compareBtn').addEventListener('click', () => {
    if (!originalGltfJson || !exportedGltfJson) {
        alert('Both original and exported models must be available for comparison!');
        return;
    }

    console.log({ originalGltfJson });
    console.log({ exportedGltfJson });
    
    const comparisonDiv = document.getElementById('comparison');
    comparisonDiv.style.display = 'block';
    
    /** This actually lags the shit out of your machine because there are so many differences... */

    // Compare the two JSON objects
    // const differences = findDifferences(originalGltfJson, exportedGltfJson);
    
    // // Display the comparison
    // comparisonDiv.innerHTML = `
    //     <h2>GLTF Comparison</h2>
    //     <h3>Differences Found: ${Object.keys(differences).length}</h3>
    //     <pre>${JSON.stringify(differences, null, 2)}</pre>
    //     <h3>Original GLTF</h3>
    //     <pre>${JSON.stringify(originalGltfJson, null, 2)}</pre>
    //     <h3>Exported GLTF</h3>
    //     <pre>${JSON.stringify(exportedGltfJson, null, 2)}</pre>
    // `;
});

// Toggle between 3D view and comparison view
document.getElementById('toggleViewBtn').addEventListener('click', () => {
    const comparisonDiv = document.getElementById('comparison');
    if (comparisonDiv.style.display === 'none' || comparisonDiv.style.display === '') {
        comparisonDiv.style.display = 'block';
    } else {
        comparisonDiv.style.display = 'none';
    }
});

// Function to find differences between two objects
function findDifferences(obj1, obj2, path = '') {
    const differences = {};
    
    // Check properties in obj1
    for (const key in obj1) {
        const newPath = path ? `${path}.${key}` : key;
        
        // If property doesn't exist in obj2
        if (!(key in obj2)) {
            differences[newPath] = {
                type: 'missing_in_obj2',
                value1: obj1[key]
            };
            continue;
        }
        
        // If property types are different
        if (typeof obj1[key] !== typeof obj2[key]) {
            differences[newPath] = {
                type: 'type_mismatch',
                value1: obj1[key],
                value2: obj2[key]
            };
            continue;
        }
        
        // If property is an object, recurse
        if (typeof obj1[key] === 'object' && obj1[key] !== null && obj2[key] !== null) {
            // Skip arrays of numbers (likely vertex data)
            if (Array.isArray(obj1[key]) && obj1[key].length > 0 && typeof obj1[key][0] === 'number') {
                // Compare array lengths
                if (obj1[key].length !== obj2[key].length) {
                    differences[newPath] = {
                        type: 'array_length_mismatch',
                        length1: obj1[key].length,
                        length2: obj2[key].length
                    };
                }
                // Sample check first few values
                else {
                    let hasDifference = false;
                    const sampleDiffs = [];
                    const sampleSize = Math.min(5, obj1[key].length);
                    
                    for (let i = 0; i < sampleSize; i++) {
                        if (Math.abs(obj1[key][i] - obj2[key][i]) > 0.0001) {
                            hasDifference = true;
                            sampleDiffs.push({
                                index: i,
                                value1: obj1[key][i],
                                value2: obj2[key][i]
                            });
                        }
                    }
                    
                    if (hasDifference) {
                        differences[newPath] = {
                            type: 'numeric_array_differences',
                            samples: sampleDiffs
                        };
                    }
                }
            } else {
                const nestedDiffs = findDifferences(obj1[key], obj2[key], newPath);
                Object.assign(differences, nestedDiffs);
            }
        }
        // If property is a primitive value
        else if (obj1[key] !== obj2[key]) {
            differences[newPath] = {
                type: 'value_mismatch',
                value1: obj1[key],
                value2: obj2[key]
            };
        }
    }
    
    // Check for properties in obj2 that aren't in obj1
    for (const key in obj2) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in obj1)) {
            differences[newPath] = {
                type: 'missing_in_obj1',
                value2: obj2[key]
            };
        }
    }
    
    return differences;
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

animate();
