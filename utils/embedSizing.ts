// Design dimensions are provider presets, not measurements of cross-origin iframe contents.
export function getEmbedSizing(code: string, height: unknown, width: unknown, autoSize: boolean, options: { widthMode?: string; alignment?: string; paddingHorizontal?: unknown; paddingVertical?: unknown } = {}) {
  const preset = /cdorgapi\.b-cdn\.net\/widgets\/vmatchlist\.js/i.test(code) ? { width: 250, height: 600 } : /cdorgapi\.b-cdn\.net\/widgets\/matchlist\.js/i.test(code) ? { width: 400, height: 300 } : /cdorgapi\.b-cdn\.net\/widgets\/score\.js/i.test(code) ? { width: 300, height: 300 } : null;
  const manualHeight = Math.max(80, Math.min(4000, Number(height) || 250));
  const requestedWidth = Number(width);
  const designWidth = Number.isFinite(requestedWidth) && requestedWidth >= 50 ? Math.min(2000, requestedWidth) : autoSize && preset ? preset.width : null;
  const widthMode = options.widthMode === "fill" || options.widthMode === "original" ? options.widthMode : "contain";
  const alignment = options.alignment === "left" || options.alignment === "right" ? options.alignment : "center";
  const padding = (value: unknown) => value == null || value === "" || !Number.isFinite(Number(value)) ? 8 : Math.max(0, Math.min(50, Math.round(Number(value))));
  return { autoSize, designWidth, fallbackHeight: manualHeight, widgetHeight: preset?.height || 0, widthMode, alignment, paddingHorizontal: padding(options.paddingHorizontal), paddingVertical: padding(options.paddingVertical) };
}

export function embedSizingCss(sizing: ReturnType<typeof getEmbedSizing>) {
  return `html,body {
  margin: 0;
  padding: 0;
  width: 100%;
  overflow-y: auto;
  overscroll-behavior-y: auto;
  -webkit-overflow-scrolling: touch;
} body{padding:${sizing.paddingVertical}px ${sizing.paddingHorizontal}px;box-sizing:border-box;} #embed-fit{width:100%;position:relative;overflow-x:${sizing.widthMode === "original" ? "auto" : "hidden"};overflow-y:hidden;} #embed-content{display:flow-root;position:absolute;top:0;width:${sizing.designWidth ? sizing.designWidth + "px" : "100%"};margin:0;transform-origin:top left;} #embed-content iframe,#embed-content img,#embed-content video,#embed-content object,#embed-content embed{max-width:100%;box-sizing:border-box;} #embed-content iframe{display:block;margin:${sizing.alignment === "left" ? "0 auto 0 0" : sizing.alignment === "right" ? "0 0 0 auto" : "0 auto"};} #embed-content img{height:auto;}`;
}

export function embedSizingScript(sizing: ReturnType<typeof getEmbedSizing>, messageKey: string) {
  return `<script>(function(){
    var root=document.getElementById('embed-content'), fit=document.getElementById('embed-fit');
    if(!root||!fit)return;
    var last=0, pending=false, design=${JSON.stringify(sizing.designWidth)}, auto=${JSON.stringify(sizing.autoSize)}, key=${JSON.stringify(messageKey).replace(/</g, "\\u003c")};
    var mode=${JSON.stringify(sizing.widthMode)}, align=${JSON.stringify(sizing.alignment)}, vertical=${sizing.paddingVertical};
    function measure(){
      pending=false;
      var available=fit.clientWidth;if(!available)return;
      var width=design||available, scale=mode==='fill'?available/width:mode==='original'?1:Math.min(1,available/width);
      var free=Math.max(0,available-width*scale);
      root.style.transform='scale('+scale+')';root.style.left=(align==='left'?0:align==='right'?free:free/2)+'px';
      var h=Math.max(root.scrollHeight,root.offsetHeight);
      if(!h)return;
      fit.style.height=Math.ceil(h*scale)+'px';
      if(!auto)return;
      // Do not infer remote iframe document height; its outer dimensions are all we can see.
      var measured=Math.max(80,Math.min(4000,Math.ceil(h*scale+2*vertical)));
      if(Math.abs(measured-last)<2)return;last=measured;
      var msg={type:'embed-size',height:measured,key:key};
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      else if(window.parent!==window)window.parent.postMessage(msg,'*');
    }
    function schedule(){if(!pending){pending=true;requestAnimationFrame(measure);}}
    if(window.ResizeObserver){var ro=new ResizeObserver(schedule);ro.observe(root);}
    if(window.MutationObserver){var mo=new MutationObserver(schedule);mo.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['src','width','height']});}
    root.addEventListener('load',schedule,true);window.addEventListener('resize',schedule);window.addEventListener('load',schedule);
    schedule();setTimeout(schedule,500);setTimeout(schedule,1500);setTimeout(schedule,3500);
  })();</script>`;
}
