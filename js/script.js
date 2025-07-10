let slots = {};
let selectedSlot = 0;
let currentPage = 1;
let itemNameMap = {};

function ensurePage(page) {
  if (!slots[page]) slots[page] = Array(54).fill(null);
}

async function loadItems() {
  const datalist = document.getElementById('items');
  datalist.innerHTML = '';
  itemNameMap = {};
  try {
    const response = await fetch('https://raw.githubusercontent.com/misode/mcmeta/registries/item/data.json');
    if (!response.ok) throw new Error('Erro ao carregar itens: ' + response.statusText);
    const itemsArray = await response.json();
    itemsArray.forEach(itemId => {
      itemNameMap[itemId] = {
        id: itemId,
        name: itemId.replace(/_/g, ' '),
      };
      const option = document.createElement('option');
      option.value = itemId;
      datalist.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar a lista de IDs de itens do Minecraft:", error);
    alert("Erro ao carregar a lista de IDs de itens do Minecraft. Verifique sua conexão ou o link da API.");
  }
}

function getItemImageURL(itemId) {
  const name = itemId
    .split('_')
    .map(w => w.toLowerCase() === 'and' ? 'and' : w.charAt(0).toUpperCase() + w.slice(1))
    .join('_');
    
  return `assets/imgs/${itemId}.png`;
}

function renderInventory() {
  const inventoryDiv = document.getElementById('inventory');
  inventoryDiv.innerHTML = '';
  const inventorySize = parseInt(document.getElementById('inventorySize').value);
  inventoryDiv.style.gridTemplateColumns = `repeat(9, 40px)`;
  inventoryDiv.style.gridTemplateRows = `repeat(${inventorySize / 9}, 40px)`;
  document.getElementById('pageCounter').innerText = `Página ${currentPage}`;

  ensurePage(currentPage);

  for (let i = 0; i < inventorySize; i++) {
    const slotDiv = document.createElement('div');
    slotDiv.classList.add('slot');
    slotDiv.dataset.slot = i;
    slotDiv.addEventListener('click', () => openPopup(i));

    const item = slots[currentPage]?.[i];
    if (item && item.material) {
      const img = document.createElement('img');
      img.alt = item.material;
      
      img.src = getItemImageURL(item.material);
      
      const itemMaterialRef = item.material;

      img.onerror = function() {
        console.warn(`Erro ao carregar imagem para '${itemMaterialRef}'. URL tentada: ${img.src}`);
        img.style.display = 'none';
        const textSpan = document.createElement('span');
        textSpan.classList.add('material-text');
        textSpan.innerText = itemMaterialRef.replace(/_/g, ' ');
        slotDiv.appendChild(textSpan);
      };
      slotDiv.appendChild(img);
    }
    inventoryDiv.appendChild(slotDiv);
  }
}

function openPopup(slot) {
  selectedSlot = slot;
  const item = slots[currentPage]?.[selectedSlot];
  document.getElementById('material').value = item ? item.material : '';
  document.getElementById('buyPrice').value = item ? item.buyPrice : 0;
  document.getElementById('sellPrice').value = item ? item.sellPrice : 0;
  document.getElementById('itemPopup').classList.remove('hidden');
}

function saveItem() {
  const material = document.getElementById('material').value;
  const buyPrice = parseFloat(document.getElementById('buyPrice').value);
  const sellPrice = parseFloat(document.getElementById('sellPrice').value);

  console.log('Material existe no itemNameMap?', !!itemNameMap[material]);

  if (material && itemNameMap[material]) {
    ensurePage(currentPage);
    slots[currentPage][selectedSlot] = {
      material: material,
      buyPrice: buyPrice,
      sellPrice: sellPrice,
      slot: selectedSlot,
      page: currentPage
    };
  } else {
    console.warn(`Material '${material}' não encontrado na base de dados de itens. Removendo item do slot.`);
    alert(`Material '${material}' inválido. Por favor, digite um ID de item do Minecraft válido (ex: STONE, OAK_PLANKS). O item foi removido do slot.`);
    deleteItem();
    closePopup();
    renderInventory();
    return;
  }
  closePopup();
  renderInventory();
}

function deleteItem() {
  ensurePage(currentPage);
  slots[currentPage][selectedSlot] = null;
  closePopup();
  renderInventory();
}

function closePopup() {
  document.getElementById('itemPopup').classList.add('hidden');
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--;
    renderInventory();
  }
}

function nextPage() {
  currentPage++;
  renderInventory();
}

function colorizeMinecraftText(input) {
  const colors = {
    '0': '#000000','1': '#0000AA','2': '#00AA00','3': '#00AAAA',
    '4': '#AA0000','5': '#AA00AA','6': '#FFAA00','7': '#AAAAAA',
    '8': '#555555','9': '#5555FF','a': '#55FF55','b': '#55FFFF',
    'c': '#FF5555','d': '#FF55FF','e': '#FFFF55','f': '#FFFFFF',
    'l': 'font-weight:bold','n': 'text-decoration:underline',
    'o': 'font-style:italic','m': 'text-decoration:line-through',
    'r': 'reset'
  };
  let output = '', currentStyles = [];
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '&' && i + 1 < input.length) {
      const code = input[++i].toLowerCase();
      if (code === 'r') {
        while (currentStyles.length > 0) {
          output += '</span>';
          currentStyles.pop();
        }
        continue;
      }
      const style = colors[code];
      if (!style) continue;

      if (style === 'reset') {
        while (currentStyles.length > 0) {
          output += '</span>';
          currentStyles.pop();
        }
      } else {
        const css = style.startsWith('#') ? `color:${style}` : style;
        output += `<span style="${css}">`;
        currentStyles.push(code);
      }
    } else {
      output += input[i];
    }
  }
  while (currentStyles.length > 0) {
    output += '</span>';
    currentStyles.pop();
  }
  return output;
}

async function generateYAML() {
  const output = document.getElementById('output');
  output.classList.remove('hidden');
  const rawMenuName = document.getElementById('menuName').value.trim();
  
  const cleanMenuNameForYamlKey = rawMenuName.replace(/&[0-9a-fk-or]/gi, '').replace(/\"/g, '');
  // *** LINHA CORRIGIDA AQUI: Ordem dos replaces para espaços e caracteres inválidos ***
  const yamlKeyName = cleanMenuNameForYamlKey.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, '') || 'menu';

  const inventorySize = parseInt(document.getElementById('inventorySize').value);

  let yaml = `${yamlKeyName}:
  name: "${rawMenuName} (page %page%)"
  size: ${inventorySize}
  fillItem:
    material: BLACK_STAINED_GLASS_PANE
    name: " "
  items:`;

  let count = 1;
  const pages = Object.keys(slots).map(n => parseInt(n)).sort((a, b) => a - b);
  for (const page of pages) {
    for (let i = 0; i < slots[page].length; i++) {
      const item = slots[page][i];
      if (item) {
        yaml += `\n    ${count}:
      type: item
      item:
        material: ${item.material.toUpperCase()}
        quantity: 1
      buyPrice: ${item.buyPrice}
      sellPrice: ${item.sellPrice}
      slot: ${item.slot}`;
        if (page > 1) yaml += `\n      page: ${page}`;
        count++;
      }
    }
  }
  output.innerText = yaml;

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(yaml);
  }
}

function downloadYAML() {
  generateYAML();
  const yamlText = document.getElementById('output').innerText;
  
  const rawMenuName = document.getElementById('menuName').value.trim();
  const cleanMenuNameForDownload = rawMenuName.replace(/&[0-9a-fk-or]/gi, '').replace(/\"/g, '');
  const fileName = cleanMenuNameForDownload.replace(/\s+/g, '_').toLowerCase() || 'menu';
  
  const blob = new Blob([yamlText], { type: 'text/yaml' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}.yml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}


document.getElementById('loadYamlBtn').addEventListener('click', loadYAMLFile);

async function loadYAMLFile() {
  const fileInput = document.getElementById('yamlFile');
  const file = fileInput.files[0];

  if (!file) {
    alert("Por favor, selecione um arquivo YAML para carregar.");
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    const yamlContent = e.target.result;
    try {
      const parsedData = parseSimpleYAML(yamlContent);
      if (parsedData && parsedData.items) {
        slots = {};
        currentPage = 1;

        document.getElementById('menuName').value = parsedData.name.replace(/\s*\(page\s*%page%\)/gi, '').trim() || '';
        document.getElementById('inventorySize').value = parsedData.size || 54;

        for (const itemKey in parsedData.items) {
          const item = parsedData.items[itemKey];
          const page = item.page || 1;
          ensurePage(page);
          if (item.slot !== undefined && item.item && item.item.material) {
            slots[page][item.slot] = {
              material: item.item.material,
              buyPrice: item.buyPrice,
              sellPrice: item.sellPrice,
              slot: item.slot,
              page: page
            };
          }
        }
        renderInventory();
        document.getElementById('menuName').dispatchEvent(new Event('input'));
      } else {
        alert("Erro ao analisar o arquivo YAML ou nenhuma seção 'items' encontrada. Verifique a estrutura.");
      }
    } catch (error) {
      console.error("Erro ao carregar ou analisar o arquivo YAML:", error);
      alert("Erro ao carregar ou analisar o arquivo YAML. Verifique o console para mais detalhes.");
    }
  };
  reader.readAsText(file);
}

function parseSimpleYAML(yamlString) {
    const lines = yamlString.split('\n');
    let data = {};
    let currentTopLevelKey = null;
    let currentItemKey = null;
    let inItemsSection = false;
    let currentItemObject = null;

    for (const line of lines) {
        const trimmedLine = line.trim();
        const indentLevel = line.match(/^\s*/)[0].length;

        if (!trimmedLine || trimmedLine.startsWith('#')) continue;

        let topLevelMatch = trimmedLine.match(/^([a-zA-Z0-9_]+):$/);
        if (topLevelMatch && indentLevel === 0) {
            currentTopLevelKey = topLevelMatch[1];
            data[currentTopLevelKey] = {};
            inItemsSection = false;
            currentItemKey = null;
            currentItemObject = null;
            continue;
        }

        if (!currentTopLevelKey) continue;

        if (indentLevel === 2) {
            let propMatch = trimmedLine.match(/^(name|size|fillItem|items):\s*(.*)$/);
            if (propMatch) {
                const propName = propMatch[1];
                let propValue = propMatch[2].trim();

                if (propName === 'name') {
                    data[currentTopLevelKey].name = propValue.replace(/"/g, '');
                } else if (propName === 'size') {
                    data[currentTopLevelKey].size = parseInt(propValue);
                } else if (propName === 'items') {
                    inItemsSection = true;
                    data[currentTopLevelKey].items = {};
                }
            }
            continue;
        }

        if (inItemsSection) {
            if (indentLevel === 4) {
                let itemKeyMatch = trimmedLine.match(/^(\d+):$/);
                if (itemKeyMatch) {
                    currentItemKey = itemKeyMatch[1];
                    data[currentTopLevelKey].items[currentItemKey] = { item: {} };
                    currentItemObject = data[currentTopLevelKey].items[currentItemKey];
                }
                continue;
            }

            if (!currentItemKey || !currentItemObject) continue;

            if (indentLevel === 6) {
                if (trimmedLine === 'type: item') {
                    currentItemObject.type = 'item';
                } else if (trimmedLine === 'item:') {
                    // Esta é apenas uma marca para propriedades aninhadas de 'item', não processa valor
                } else {
                    let propMatch = trimmedLine.match(/^(buyPrice|sellPrice|slot|page):\s*(.*)$/);
                    if (propMatch) {
                        const propName = propMatch[1];
                        let propValue = propMatch[2].trim();
                        currentItemObject[propName] = (propName === 'buyPrice' || propName === 'sellPrice') ? parseFloat(propValue) : parseInt(propValue);
                    }
                }
                continue;
            }

            if (indentLevel === 8) {
                let propMatch = trimmedLine.match(/^(material|quantity):\s*(.*)$/);
                if (propMatch) {
                    const propName = propMatch[1];
                    let propValue = propMatch[2].trim();
                    if (currentItemObject.item) {
                        currentItemObject.item[propName] = (propName === 'quantity') ? parseInt(propValue) : propValue;
                    }
                }
                continue;
            }
        }
    }

    const finalData = {};
    if (currentTopLevelKey && data[currentTopLevelKey]) {
        finalData.name = data[currentTopLevelKey].name || '';
        finalData.size = data[currentTopLevelKey].size || 54;
        finalData.items = data[currentTopLevelKey].items || {};
    }

    return finalData;
}

document.addEventListener('DOMContentLoaded', () => {
  loadItems();
  ensurePage(currentPage);
  renderInventory();

  document.getElementById('menuName').addEventListener('input', (event) => {
    const previewDiv = document.getElementById('previewMenuName');
    previewDiv.innerHTML = colorizeMinecraftText(event.target.value);
  });

  document.getElementById('inventorySize').addEventListener('change', renderInventory);

  document.getElementById('saveItemBtn').addEventListener('click', saveItem);
  document.getElementById('deleteItemBtn').addEventListener('click', deleteItem);
  document.getElementById('closePopupBtn').addEventListener('click', closePopup);

  document.getElementById('prevPage').addEventListener('click', prevPage);
  document.getElementById('nextPage').addEventListener('click', nextPage);

  document.getElementById('generateBtn').addEventListener('click', generateYAML);

  document.getElementById('menuName').dispatchEvent(new Event('input'));
});