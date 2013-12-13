var editor = null;
var defaultFilename = 'epiceditor';
var diary = {};
var editing = false;
var editingEntry = {};
var working = false;
var savingProgress = 0;
function init(){
	var opts = {
					container: 'epiceditor',
					textarea: null,
					basePath: 'css',
					clientSideStorage: false,
					localStorageName: 'epiceditor',
					useNativeFullscreen: true,
					parser: marked,
					file: {
						name: defaultFilename,
						defaultContent: '',
						autoSave: false
					},
					theme: {
						base: '/epiceditor_themes/base/epiceditor.css',
						preview: '/epiceditor_themes/preview/preview-dark.css',
						editor: '/epiceditor_themes/editor/epic-dark.css'
					},
					button: {
						preview: true,
						fullscreen: true,
						bar: "auto"
					},
					focusOnLoad: true,
					shortcut: {
						modifier: 18,
						fullscreen: 70,
						preview: 80
					},
					string: {
						togglePreview: 'Toggle Preview Mode',
						toggleEdit: 'Toggle Edit Mode',
						toggleFullscreen: 'Enter Fullscreen'
					},
					autogrow: {
						minHeight:150,
						maxHeight:500,
						scroll:true
					}
				}
	editor = new EpicEditor(opts);
	closedState();
}

function decryptDiary(){
	var passphrase = $("#passphrase").val();
	console.log(passphrase);
	if(passphrase == null || passphrase == "" || passphrase.length < 1){
		alert("enter a passphrase");
	}else{		
		var cipherDiary = window.localStorage.getItem("triplesecdiary");
		decrypt(cipherDiary, passphrase, function (clearjson){
				if(clearjson != null && clearjson.length > 0){
					diary = JSON.parse(clearjson);
					sortDiaryEntries();
					refreshDiary();
					$("#savingProgress").text("Decryption complete");
					openState();
				}else{
					diary = {'entries':[]}
					console.log(diary);
					newDiaryState();
				}				
			});	
	}
}

function percentDone(obj){
console.log(obj);
	$("#savingProgress").text("Working on: " + obj.what);
}

function decrypt(ciphertext, passphrase, func){
	working = true;
	savingProgress = 0;
	if(ciphertext != null && ciphertext.length > 0){
		triplesec.decrypt ({
			data:          new triplesec.Buffer(ciphertext, "hex"),
			key:           new triplesec.Buffer(passphrase),    
			progress_hook: function (obj) { console.log("decrypting");percentDone(obj); }

		}, function (err, buff) {
			if (! err) { 
				func(buff.toString());
			}else{
				alert(err);
			}
			working=false;
		});
	}else{
		func("");
		working=false;
	}
}

function encrypt(obj, passphrase, func){
	working = true;
	if(obj.entries == null || obj.entries.length < 1){
		console.log("no entries found");
		func("");
		working=false;
	}else{
		var cleartext = JSON.stringify(obj);
		var cipherEntry = null;		
			
		triplesec.encrypt ({
			data:          new triplesec.Buffer(cleartext),
			key:           new triplesec.Buffer(passphrase),
			progress_hook: function (obj) { console.log("encrypting");percentDone(obj);}

		}, function(err, buff) {	  
			if (! err) { 
				func(buff.toString('hex'));
			}
			working=false;
		});
	}
}

function refreshDiary(){	
	var diaryDiv = $('#diary');
	diaryDiv.empty();	
	for(var i = 0; i < diary.entries.length; i++){		
		console.log(diary.entries[i]);
		var entryHtml = "<div class='entry'><div class='entryTime'>";
		entryHtml += diary.entries[i].time;
		entryHtml += "</div><div class='entryText'>"
		entryHtml += marked(diary.entries[i].entry);
		entryHtml += "</div></div>"
		diaryDiv.append(entryHtml);
	}
}

function sortDiaryEntries(){
	diary.entries = diary.entries.sort(function(a, b){
		return b.sortTime.localeCompare(a.sortTime);
	});
}

function newEntry(){
	editor.load();
	editingState();
}

function cancelEntry(){
	editor.unload();
}

function saveEntry(){	
	var passphrase = $("#passphrase").val();
	console.log(passphrase);
	if(passphrase == null || passphrase == "" || passphrase.length < 1){
		alert("enter a passphrase");
	}else if(passphrase.length < 8){
		alert("this passphrase is weaksauce, do better");
	}else if(diary != null){
	
		var cleartext = editor.getText();
		var now = new Date();
		var sortableDate = now.toISOString();
		var clearEntry = {'time':now, 'sortTime': sortableDate, 'entry':cleartext};
		if(diary.entries.length < 1){
			diary.entries.push(clearEntry);
		}else{
			diary.entries.unshift(clearEntry);
		}
		refreshDiary();
		editor.unload();
		openState();
		$("#epiceditor").height("0px");
		
		var cipherDiary = null;
		console.log(diary);
		encrypt(diary, passphrase, function (cipherDiary) {	
				if(cipherDiary==""){
					console.log("nothing changed");
				}else{
					window.localStorage.setItem("triplesecdiary", cipherDiary);
					$("#savingProgress").text("Encryption complete");
				}			
			});
	}
}

function closedState(){
	$("button.entryButton").hide();
}

function newDiaryState(){
	$("button.entryButton").hide();
	$("button#newEntry").show();
	//walkthru should happen here
	$("#savingProgress").text("Welcome - try making your first entry:");
	newEntry();
}

function openState(){
	$("button.entryButton").hide();
	$("button#newEntry").show();
}

function editingState(){
	$("button.entryButton").show();
	$("button#newEntry").hide();
}