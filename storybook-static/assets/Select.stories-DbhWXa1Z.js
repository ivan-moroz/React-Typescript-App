import{j as t}from"./jsx-runtime-u17CrQMm.js";import{r as o}from"./iframe-CRyNqr96.js";import"./preload-helper-PPVm8Dsz.js";function w({label:s,onRemove:l}){return t.jsxs("span",{className:"select-tag",children:[t.jsx("span",{children:s}),t.jsx("button",{type:"button",className:"select-tag-remove","aria-label":`Remove ${s}`,onClick:n=>{n.stopPropagation(),l()},children:t.jsx("span",{className:"material-icons",children:"close"})})]})}w.__docgenInfo={description:"",methods:[],displayName:"SelectTag",props:{label:{required:!0,tsType:{name:"string"},description:""},onRemove:{required:!0,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""}}};function h({options:s,value:l,onChange:n,isMulti:a=!1}){const[u,i]=o.useState(!1),[b,x]=o.useState(0),y=o.useRef(null),c=a&&Array.isArray(l)?l:[],M=!a&&typeof l=="string"?s.find(e=>e.value===l):void 0,j=s.filter(e=>c.includes(e.value)),k=[{value:void 0,label:"None"},...s],d=a?s:k,O=M?.label??"Select option",E=e=>a?!!e&&c.includes(e):e===l,N=e=>{if(a){if(!e)return;const r=c.includes(e)?c.filter(S=>S!==e):[...c,e];n(r);return}n(e),i(!1)},C=e=>{if(!a)return;const r=c.filter(S=>S!==e);n(r)};o.useEffect(()=>{const e=r=>{y.current?.contains(r.target)||i(!1)};return document.addEventListener("mousedown",e),()=>document.removeEventListener("mousedown",e)},[]);const _=e=>{if(!u&&(e.key==="Enter"||e.key===" ")){e.preventDefault(),i(!0);return}switch(e.key){case"ArrowDown":e.preventDefault(),x(r=>(r+1)%d.length);break;case"ArrowUp":e.preventDefault(),x(r=>r===0?d.length-1:r-1);break;case"Enter":e.preventDefault(),N(d[b].value);break;case"Escape":i(!1);break}};return t.jsx(t.Fragment,{children:t.jsxs("div",{ref:y,tabIndex:0,className:"select",onKeyDown:_,"aria-haspopup":"listbox","aria-expanded":u,children:[t.jsxs("div",{"data-testid":"select-trigger",className:"select-value",onClick:()=>i(e=>!e),children:[a?t.jsx("span",{className:"select-multi-values",children:j.length===0?t.jsx("span",{className:"select-label",children:"Select options"}):j.map(e=>t.jsx(w,{label:e.label,onRemove:()=>C(e.value)},e.value))}):t.jsx("span",{className:"select-label",children:O}),t.jsx("span",{className:`material-icons select-arrow ${u?"open":""}`,children:"keyboard_arrow_down"})]}),u&&t.jsx("ul",{"data-testid":"select-listbox",className:"select-options",role:"listbox",children:d.map((e,r)=>t.jsx("li",{role:"option","aria-selected":E(e.value),className:`option ${E(e.value)?"selected":""} ${r===b?"highlighted":""}`,onMouseEnter:()=>x(r),onClick:()=>{N(e.value)},children:e.label},e.value??"none"))})]})})}h.__docgenInfo={description:"",methods:[],displayName:"CustomSelect",props:{isMulti:{defaultValue:{value:"false",computed:!1},required:!1}}};const A=[{value:"react",label:"React"},{value:"vue",label:"Vue"},{value:"angular",label:"Angular"},{value:"svelte",label:"Svelte"},{value:"solid",label:"Solid"}];function D(s){const[l,n]=o.useState(s.value);return o.useEffect(()=>{n(s.value)},[s.value,s.isMulti]),t.jsx("div",{style:{width:320,minHeight:320},children:s.isMulti?t.jsx(h,{...s,value:Array.isArray(l)?l:[],onChange:a=>{n(a),s.onChange(a)}}):t.jsx(h,{...s,value:typeof l=="string"?l:void 0,onChange:a=>{n(a),s.onChange(a)}})})}const $={title:"Components/Select",component:h,args:{options:A,onChange:()=>{}},render:s=>t.jsx(D,{...s})},p={args:{isMulti:!1}},m={args:{isMulti:!1,value:"vue"}},v={args:{isMulti:!0,value:[]}},f={args:{isMulti:!0,value:["react","vue"]}},g={args:{isMulti:!1,options:[]}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    isMulti: false
  }
}`,...p.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    isMulti: false,
    value: "vue"
  }
}`,...m.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    isMulti: true,
    value: []
  }
}`,...v.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    isMulti: true,
    value: ["react", "vue"]
  }
}`,...f.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    isMulti: false,
    options: []
  }
}`,...g.parameters?.docs?.source}}};const q=["Single","SingleSelected","Multiple","MultipleSelected","EmptyOptions"];export{g as EmptyOptions,v as Multiple,f as MultipleSelected,p as Single,m as SingleSelected,q as __namedExportsOrder,$ as default};
