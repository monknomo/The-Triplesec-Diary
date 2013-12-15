var editor = null;
var defaultFilename = 'epiceditor';
var diary = null;
var editing = false;
var editingEntry = null;
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
    diary = window.localStorage.getItem("triplesecdiary");
    if(diary == null){
        createNewDiaryState();
    }else{
        closedState();
    }
    $(document).jkey('ctrl+s', function(){
        console.log("hi");
    });
}

function handle_passphraseKeypress(){
    if(window.event) // IE8 and earlier
	{
        x=event.keyCode;
	}
    else if(event.which) // IE9/Firefox/Chrome/Opera/Safari
	{
        x=event.which;
	}
    //if its the enter key decrypt
    if(x == 13){
        decryptDiary_onclick();
    }
}

function helloworld(){
    alert("hello, world");
}

function deleteEntry(obj){
    console.log(obj.id);
    var entryTime = obj.id.substring(7);    
    for(var i = 0; i < diary.entries.length; i++){
        if( diary.entries[i].sortTime == entryTime ){
            var passphrase = getPassphrase();
            if(passphrase != null){
                diary.entries.splice(i,1);
                refreshDiary();
                encryptDiary(passphrase);
            }
            break;
        }
    }
}

function editEntry_buttonClick(obj){
    console.log(obj.id);
    var entryTime = obj.id.substring(5);
    editEntry(entryTime);
}

function editEntry_doubleClick(obj){
    var entryTime = obj.id.substring(6);
    console.log(entryTime);
    editEntry(entryTime);
}

function editEntry(entryTime){
    var entryIndex = -1;
    for(var i = 0; i < diary.entries.length; i++){
        if( diary.entries[i].sortTime == entryTime ){
            entryIndex = i;
            break;
        }
    }
    if(entryIndex > -1){
        editEntryState();
        editor.setText(diary.entries[entryIndex].entry);
        editingEntry = entryIndex;
    }
}

function closeDiary(){
    $("#passphrase").val("");
    $("#passphraseConfirm").val("");
    $("#diary").empty();
    diary = null;
    editing = false;
    editingEntry = null;
    working = false;
    closedState();
    $("#savingProgress").text("");
}

function decryptDiary_onclick(){
    if(diary == null){
        var passphrase = $("#passphrase").val();
        var passphraseConfirm = $("#passphraseConfirm").val();
        if(passphrase.length > 0 ){
            if(passphrase == passphraseConfirm){
                diary = {'entries':[]}
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
                newDiaryState();
            }else{
                alert("passphrases need to match");
            }
        }else{
            alert("passphrase has to be longer than 0");
        }
    }else{
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
                        if(diary.entries.length>0){
                            openState();
                        }else{
                            newDiaryState()
                        }   
                    }else{
                        diary = {'entries':[]}
                        newDiaryState();
                    }				
                });	
        }
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
    var cleartext = JSON.stringify(obj);
        
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

function encryptDiary(passphrase){
    var cipherDiary = null;
    console.log(diary);
    if(diary.entries == null || diary.entries.length < 1){
        console.log("no entries found");
        working=false;
    }else{
        encrypt(diary, passphrase, function (cipherDiary) {	
                if(cipherDiary==""){
                    console.log("nothing changed");
                }else{
                    console.log("diary saved");
                    window.localStorage.setItem("triplesecdiary", cipherDiary);
                    $("#savingProgress").text("Encryption complete");
                }			
            });
    }
}

function refreshDiary(){	
	var diaryDiv = $('#diary');
	diaryDiv.empty();	
	for(var i = 0; i < diary.entries.length; i++){		
		console.log(diary.entries[i]);
		var entryHtml = "<div class='entry' id='entry_" 
        entryHtml += diary.entries[i].sortTime
        entryHtml += "' ondblclick='editEntry_doubleClick(this)'><div class='entryTime'>";
		entryHtml += isoDateStringToDate(diary.entries[i].sortTime);
		entryHtml += "</div><div class='entryText'>"
		entryHtml += marked(diary.entries[i].entry);
		entryHtml += "</div><div><button onclick='editEntry_buttonClick(this)' id='edit_"
        entryHtml += diary.entries[i].sortTime
        entryHtml += "'>Edit</button><button onclick='deleteEntry(this)' id='delete_"
        entryHtml += diary.entries[i].sortTime
        entryHtml += "'>Delete</button></div></div>"
		diaryDiv.append(entryHtml);
	}
}

function sortDiaryEntries(){
	diary.entries = diary.entries.sort(function(a, b){
		return b.sortTime.localeCompare(a.sortTime);
	});
}

function newEntry(){	
	newEntryState();
    //editor.load();
}

function cancelEntry(){	
    openState();
    editor.unload();
}

function getPassphrase(){
    var passphrase = $("#passphrase").val();
	console.log(passphrase);
	if(passphrase == null || passphrase == "" || passphrase.length < 1){
		alert("enter a passphrase");
        return null;
	}else if(passphrase.length < 8){
		alert("this passphrase is weaksauce, do better");
        return null;
    }
    return passphrase;
}

function saveEntry(){	
	var passphrase = getPassphrase();
	if(diary != null && passphrase != null){
        if(editing){
            var cleartext = editor.getText();
            var now = new Date();
            var modifiedDate = now.toISOString();
            diary.entries[editingEntry].entry = cleartext;
            diary.entries[editingEntry].modified = modifiedDate;
        }else{	
            var cleartext = editor.getText();
            var now = new Date();
            var sortableDate = now.toISOString();
            var clearEntry = {'sortTime': sortableDate, 'entry':cleartext, 'modified':sortableDate};
            if(diary.entries.length < 1){
                diary.entries.push(clearEntry);
            }else{
                diary.entries.unshift(clearEntry);
            }        	            
        }	
        openState();
        editor.unload();
        encryptDiary(passphrase);
        refreshDiary();		
	}
}

function isoDateStringToDate(isodate){
    var startTime = new Date(isodate);
    return new Date( startTime.getTime() + ( startTime.getTimezoneOffset() * 60000 ) );
}

function closedState(){
    editing = false;
	$("button.entryButton").hide();
    $("#openDiary").show();
    $("#passphraseConfirmGroup").hide();
    $("#epiceditor").hide();
    $("#closeDiary").hide();
}

function createNewDiaryState(){
    editing = false;
    $("#openDiary").show();
    $("#decryptDiary").text("New Diary"); 
    $("button.entryButton").hide();   
    $("#epiceditor").hide();
    $("#closeDiary").hide();
}

function newDiaryState(){    
	$("button.entryButton").hide();
	$("button#newEntry").show();
    $("#openDiary").hide();
    $("#epiceditor").show();
	//walkthru should happen here
	$("#savingProgress").text("Welcome - try making your first entry:");
    editing = true;
	newEntry();
    $("#closeDiary").hide();
}

function openState(){
    editing = false;
	$("button.entryButton").hide();
	$("button#newEntry").show();
    $("#openDiary").hide();
    $("#epiceditor").hide();
    $("#closeDiary").show();
}

function editorOpenState(){
	$("button.entryButton").show();
	$("button#newEntry").hide();
    $("#openDiary").hide();
    $("#epiceditor").show();
    $("#closeDiary").show();
}

function newEntryState(){
    editorOpenState();
    editing = false;
    editingEntry = null;
    editor.load();
}

function editEntryState(){
    editorOpenState();
    editing=true;
    editor.load();
}
