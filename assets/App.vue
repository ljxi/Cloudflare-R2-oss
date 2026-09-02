<template>
  <div class="main" @dragenter.prevent @dragover.prevent @drop.prevent="onDrop">
    <progress
      v-if="uploadProgress !== null"
      :value="uploadProgress"
      max="100"
    ></progress>
    <UploadPopup
      v-model="showUploadPopup"
      @upload="onUploadClicked"
      @createFolder="createFolder"
    ></UploadPopup>
    <button class="upload-button circle" @click="showUploadPopup = true">
      <img
        style="filter: invert(100%)"
        src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/upload_file/materialicons/36dp/2x/baseline_upload_file_black_36dp.png"
        alt="Upload"
        width="36"
        height="36"
        @contextmenu.prevent
      />
    </button>
    <div class="app-bar">
      <input type="search" v-model="search" aria-label="Search" />
      <div class="menu-button">
        <button class="circle" @click="showMenu = true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="24" height="24" title="Menu" style="display: block; margin: 4px">
            <path d="M120 256c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm160 0c0 30.9-25.1 56-56 56s-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56zm104 56c-30.9 0-56-25.1-56-56s25.1-56 56-56s56 25.1 56 56s-25.1 56-56 56z" />
          </svg>
        </button>
        <Menu
          v-model="showMenu"
          :items="[{ text: '名称A-Z' }, { text: '大小↑' } ,{ text: '大小↓' }, { text: '粘贴' }]"
          @click="onMenuClick"
        />
      </div>
    </div>
    <ul class="file-list">
      <li v-if="cwd !== ''">
        <div tabindex="0" class="file-item" @click="cwd = cwd.replace(/[^\/]+\/$/, '')" @contextmenu.prevent>
          <div class="file-icon"><img src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/folder/materialicons/36dp/2x/baseline_folder_black_36dp.png" width="36" height="36" alt="Folder" /></div>
          <span class="file-name">..</span>
        </div>
      </li>
      <li v-for="folder in filteredFolders" :key="folder">
        <div tabindex="0" class="file-item" @click="cwd = folder" @contextmenu.prevent="showContextMenu = true; focusedItem = folder">
          <div class="file-icon"><img src="https://cdnjs.cloudflare.com/ajax/libs/material-design-icons/4.0.0/png/file/folder/materialicons/36dp/2x/baseline_folder_black_36dp.png" width="36" height="36" alt="Folder" /></div>
          <span class="file-name" v-text="folder.match(/.*?([^/]*)\/?$/)[1]"></span>
          <div style="margin-right: 10px;margin-left: auto;" @click.stop="showContextMenu = true; focusedItem = folder">
            <svg viewBox="0 0 24 24" style="height: 30px; width: 30px;"><path fill="currentColor" d="M10.5,12A1.5,1.5 0 1,1 13.5,12A1.5,1.5 0 0,1 10.5,12M10.5,16.5A1.5,1.5 0 1,1 13.5,16.5A1.5,1.5 0 0,1 10.5,16.5M10.5,7.5A1.5,1.5 0 1,1 13.5,7.5A1.5,1.5 0 0,1 10.5,7.5M12,2A10,10 0 1,1 12,22A10,10 0 0,1 12,2M12,4A8,8 0 1,0 12,20A8,8 0 0,0 12,4Z"></path></svg>
          </div>
        </div>
      </li>
      <li v-for="file in filteredFiles" :key="file.key">
        <div @click="preview(`/raw/${file.key}`)" @contextmenu.prevent="showContextMenu = true; focusedItem = file">
          <div class="file-item">
            <MimeIcon :content-type="file.httpMetadata.contentType" :thumbnail="file.customMetadata.thumbnail ? `/raw/_$flaredrive$/thumbnails/${file.customMetadata.thumbnail}.png` : null" />
            <div>
              <div class="file-name" v-text="file.key.split('/').pop()"></div>
              <div class="file-attr"><span v-text="new Date(file.uploaded).toLocaleString()"></span><span v-text="formatSize(file.size)"></span></div>
            </div>
            <div style="margin-right: 10px;margin-left: auto;" @click.stop="showContextMenu = true; focusedItem = file">
              <svg viewBox="0 0 24 24" style="height: 30px; width: 30px;"><path fill="currentColor" d="M10.5,12A1.5,1.5 0 1,1 13.5,12A1.5,1.5 0 1,1 10.5,12M10.5,16.5A1.5,1.5 0 1,1 13.5,16.5A1.5,1.5 0 1,1 10.5,16.5M10.5,7.5A1.5,1.5 0 1,1 13.5,7.5A1.5,1.5 0 1,1 10.5,7.5M12,2A10,10 0 1,1 12,22A10,10 0 0,1 12,2Z"></path></svg>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <div v-if="loading" style="margin-top: 12px; text-align: center"><span>加载中...</span></div>
    <div v-else-if="!filteredFiles.length && !filteredFolders.length" style="margin-top: 12px; text-align: center"><span>没有文件</span></div>
    <Dialog v-model="showContextMenu">
      <div v-if="focusedItem" v-text="focusedItem.key || focusedItem" class="contextmenu-filename" @click.stop.prevent></div>
      <ul v-if="typeof focusedItem === 'string'" class="contextmenu-list">
        <li><button @click="copyLink(`/?p=${encodeURIComponent(focusedItem)}`)"><span>复制链接</span></button></li>
        <li><button @click="moveFile(focusedItem + '_$folder$')"><span>移动</span></button></li>
        <li><button style="color: red" @click="removeFile(focusedItem + '_$folder$')"><span>删除</span></button></li>
      </ul>
      <ul v-else-if="focusedItem" class="contextmenu-list">
        <li><button @click="renameFile(focusedItem.key)"><span>重命名</span></button></li>
        <li><a :href="`/raw/${focusedItem.key}`" target="_blank" download><span>下载</span></a></li>
        <li><button @click="clipboard = focusedItem.key"><span>复制</span></button></li>
        <li><button @click="moveFile(focusedItem.key)"><span>移动</span></button></li>
        <li><button @click="copyLink(`/raw/${focusedItem.key}`)"><span>复制链接</span></button></li>
        <li><button style="color: red" @click="removeFile(focusedItem.key)"><span>删除</span></button></li>
      </ul>
    </Dialog>
  </div>
</template>

<script>
import { generateThumbnail, blobDigest, multipartUpload, SIZE_LIMIT } from "/assets/main.mjs";
import Dialog from "./Dialog.vue";
import Menu from "./Menu.vue";
import MimeIcon from "./MimeIcon.vue";
import UploadPopup from "./UploadPopup.vue";

export default {
  data: () => ({
    cwd: new URL(window.location).searchParams.get("p") || "",
    files: [], folders: [], clipboard: null, focusedItem: null, loading: false,
    order: null, search: "", showContextMenu: false, showMenu: false,
    showUploadPopup: false, uploadProgress: null, uploadQueue: [],
  }),
  computed: {
    filteredFiles() { return this.search ? this.files.filter((file) => file.key.split("/").pop().includes(this.search)) : this.files; },
    filteredFolders() { return this.search ? this.folders.filter((folder) => folder.includes(this.search)) : this.folders; },
  },
  methods: {
    copyLink(link) { navigator.clipboard.writeText(new URL(link, window.location.origin).toString()); },
    async copyPaste(source, target) { await axios.put(`/api/write/items/${target}`, "", { headers: { "x-amz-copy-source": encodeURIComponent(source) } }); },
    async createFolder() {
      try {
        const folderName = window.prompt("请输入文件夹名称"); if (!folderName) return;
        this.showUploadPopup = false;
        await axios.put(`/api/write/items/${this.cwd}${folderName}/_$folder$`, "");
        this.fetchFiles();
      } catch (error) { console.log("Create folder failed", error); }
    },
    fetchFiles() {
      this.files = []; this.folders = []; this.loading = true;
      fetch(`/api/children/${this.cwd}`).then((res) => res.json()).then((files) => {
        this.files = files.value;
        if (this.order === "大小↑") this.files.sort((a,b) => a.size - b.size);
        else if (this.order === "大小↓") this.files.sort((a,b) => b.size - a.size);
        else this.files.sort((a,b) => a.key.localeCompare(b.key));
        this.folders = files.folders; this.loading = false;
      }).catch((error) => { console.error("Fetch files failed", error); this.loading = false; });
    },
    formatSize(size) { const units=["B","KB","MB","GB","TB"]; let i=0; while(size>=1024 && i<units.length-1){size/=1024;i++;} return `${size.toFixed(1)} ${units[i]}`; },
    onDrop(ev) { const files = ev.dataTransfer.items ? [...ev.dataTransfer.items].filter((item)=>item.kind === "file").map((item)=>item.getAsFile()).filter(Boolean) : ev.dataTransfer.files; this.uploadFiles(files); },
    onMenuClick(text) { if(text === "粘贴") return this.pasteFile(); this.order=text === "名称A-Z" ? null : text; this.fetchFiles(); },
    onUploadClicked(fileElement) { if(!fileElement.value)return; this.uploadFiles(fileElement.files); this.showUploadPopup=false; fileElement.value=null; },
    preview(filePath) { window.open(filePath); },
    async pasteFile() { if(!this.clipboard)return; let newName=window.prompt("Rename to:"); if(newName===null)return; if(newName==="")newName=this.clipboard.split("/").pop(); await this.copyPaste(this.clipboard,`${this.cwd}${newName}`); this.fetchFiles(); },
    async processUploadQueue() {
      if(!this.uploadQueue.length){this.fetchFiles();this.uploadProgress=null;return;}
      const {basedir,file}=this.uploadQueue.shift(); let thumbnailDigest=null;
      if(file.type.startsWith("image/") || file.type === "video/mp4"){
        try{
          const thumbnailBlob=await generateThumbnail(file); const digestHex=await blobDigest(thumbnailBlob);
          try{await axios.put(`/api/write/items/_$flaredrive$/thumbnails/${digestHex}.png`,thumbnailBlob);thumbnailDigest=digestHex;}catch(error){console.log(`Upload ${digestHex}.png failed`);}
        }catch(error){console.log(`Generate thumbnail failed`);}
      }
      try{
        const uploadUrl=`/api/write/items/${basedir}${file.name}`; const headers={};
        const onUploadProgress=(event)=>{this.uploadProgress=(event.loaded*100)/event.total;};
        if(thumbnailDigest)headers["fd-thumbnail"]=thumbnailDigest;
        if(file.size >= SIZE_LIMIT) await multipartUpload(`${basedir}${file.name}`,file,{headers,onUploadProgress});
        else await axios.put(uploadUrl,file,{headers,onUploadProgress});
      }catch(error){console.log(`Upload ${file.name} failed`,error);}
      setTimeout(()=>this.processUploadQueue());
    },
    async removeFile(key) { if(!window.confirm(`确定要删除 ${key} 吗？`))return; await axios.delete(`/api/write/items/${key}`); this.fetchFiles(); },
    async renameFile(key) { const newName=window.prompt("重命名为:"); if(!newName)return; await this.copyPaste(key,`${this.cwd}${newName}`); await axios.delete(`/api/write/items/${key}`); this.fetchFiles(); },
    async moveFile(key) {
      const currentPath=this.cwd; const allFolders=[...this.folders];
      if(currentPath!==""){const parentPath=currentPath.replace(/[^\/]+\/$/,"");if(!allFolders.includes(parentPath)&&parentPath!=="")allFolders.unshift(parentPath);}
      if(!allFolders.includes(""))allFolders.unshift("");
      const folderOptions=allFolders.map(folder=>({display:folder===""?"根目录":folder===currentPath?"当前目录":folder.replace(/.*\/(?!$)|\//g,"")+"/",value:folder}));
      const selection=window.prompt(`请选择目标目录(输入数字):\n${folderOptions.map((opt,index)=>`${index+1}. ${opt.display}`).join("\n")}\n`); if(!selection)return;
      const selectedIndex=parseInt(selection)-1; if(isNaN(selectedIndex)||selectedIndex<0||selectedIndex>=folderOptions.length){alert("无效的选择");return;}
      const targetPath=folderOptions[selectedIndex].value; const fileName=key.split('/').pop(); const finalFileName=fileName.endsWith("_$folder$")?fileName.slice(0,-9):fileName;
      const normalizedPath=targetPath===""?"":(targetPath.endsWith("/")?targetPath:targetPath+"/");
      try{
        if(key.endsWith("_$folder$")){
          const sourceBasePath=key.slice(0,-9); const targetBasePath=normalizedPath+finalFileName+"/"; const allItems=await this.getAllItems(sourceBasePath);
          for(const item of allItems){const relativePath=item.key.substring(sourceBasePath.length);await this.copyPaste(item.key,targetBasePath+relativePath);await axios.delete(`/api/write/items/${item.key}`);}
          await this.copyPaste(key,targetBasePath.slice(0,-1)+"_$folder$"); await axios.delete(`/api/write/items/${key}`);
        }else{await this.copyPaste(key,normalizedPath+finalFileName);await axios.delete(`/api/write/items/${key}`);}
        this.fetchFiles();
      }catch(error){console.error("移动失败:",error);alert("移动失败,请检查目标路径是否正确");}
    },
    async getAllItems(prefix) {
      const items=[]; const response=await fetch(new URL(`/api/children/${prefix}`,window.location.origin)); const data=await response.json();
      items.push(...data.value);
      for(const folder of data.folders){items.push({key:folder+"_$folder$",size:0,uploaded:new Date().toISOString()});items.push(...await this.getAllItems(folder));}
      return items;
    },
    uploadFiles(files) { if(this.cwd && !this.cwd.endsWith("/"))this.cwd+="/"; this.uploadQueue.push(...Array.from(files).map(file=>({basedir:this.cwd,file}))); setTimeout(()=>this.processUploadQueue()); },
  },
  watch:{cwd:{handler(){this.fetchFiles();const url=new URL(window.location);if((url.searchParams.get("p")||"")!==this.cwd){this.cwd?url.searchParams.set("p",this.cwd):url.searchParams.delete("p");window.history.pushState(null,"",url.toString());}document.title=`${this.cwd.replace(/.*\/(?!$)|\//g,"")||"/"} - 文件库`;},immediate:true}},
  created(){window.addEventListener("popstate",()=>{const searchParams=new URL(window.location).searchParams;if(searchParams.get("p")!==this.cwd)this.cwd=searchParams.get("p")||"";});},
  components:{Dialog,Menu,MimeIcon,UploadPopup},
};
</script>
<style>
.main{height:100%;}.app-bar{position:sticky;top:0;padding:8px;background-color:white;display:flex}.menu-button{display:flex;position:relative;margin-left:4px}.menu-button>button{transition:background-color .2s ease}.menu-button>button:hover{background-color:whitesmoke}.menu{position:absolute;top:100%;right:0}
</style>
