'use strict';
(() => {
  const switchBusy=value=>['card_busy','reloading','card_confirmed','modem_confirmed'].includes(value?.state);
  const downloadBusy=value=>['running','confirm','cancelling'].includes(value?.state);
  const name=profile=>profile?.nickname || profile?.name || profile?.provider || '未命名配置';
  function iccid(value){if(typeof value!=='string')throw new Error('配置 ICCID 必须保持为数字字符串。');const text=value.trim(),digits=text.replace(/[fF]$/,'');if(!/^\d{18,20}$/.test(digits) || (text!==digits && digits.length===20))throw new Error('配置 ICCID 必须为 18–20 位数字。');return digits;}
  function inventory(data){if(!data || !Array.isArray(data.profiles))throw new Error('路由器未返回可用的配置列表。');return {...data,profiles:data.profiles.map(profile=>({...profile,iccid:iccid(profile?.iccid)}))};}
  function older(next,shown){if(!shown || !next.agent_instance || next.agent_instance!==shown.agent_instance)return false;if(next.generation!==shown.generation)return Number(next.generation)<Number(shown.generation);if(next.observed_seq && shown.observed_seq)return Number(next.observed_seq)<Number(shown.observed_seq);return Number(next.observed_at || 0)<Number(shown.observed_at || 0);}
  function nickname(value){const text=value.trim();if(new TextEncoder().encode(text).length>64 || /[\x00-\x1f\x7f-\x9f]/.test(text))throw new Error('昵称最多 64 字节，且不能包含控制字符。');return text;}
  function activation(value,confirmation=''){
    const code=value.trim(),parts=code.split('$'),secret=confirmation.trim();
    if(new TextEncoder().encode(code).length>512 || /\s|[\x00-\x1f\x7f]/.test(code) || !/^LPA:1$/i.test(parts[0]) || parts.length<3)throw new Error('请粘贴以 LPA:1$ 开头的完整激活码。');
    if(!/^[a-z0-9.:-]{1,255}$/i.test(parts[1]) || !/^[a-z0-9-]*$/i.test(parts[2]))throw new Error('激活码中的服务器地址或匹配 ID 无效。');
    if(new TextEncoder().encode(secret).length>64 || /[\x00-\x1f\x7f-\x9f]/.test(secret))throw new Error('确认码最多 64 字节，且不能包含控制字符。');
    if(parts[4]==='1' && !secret)throw new Error('此配置需要运营商的确认码。');
    return {activation_code:code,...(secret ? {confirmation_code:secret} : {}),preview:true};
  }
  function warnings(profile,data){const result=[];for(const warning of profile.switch_warnings || []){if(warning==='manual_apn')result.push(`路由器使用手动 APN${data.manual_apn?.apn ? ` (${data.manual_apn.apn})` : ''}。此配置可能需要其他 APN。`);if(warning==='data_off')result.push('固件报告移动数据已关闭。切换配置后仍会保持该设置；如需上网请启用移动数据。');if(warning==='roaming_off')result.push('这看起来是漫游配置，但数据漫游已关闭。在启用漫游前可能无法连接。');}return result;}
  const switchMessage=status=>status?.network_check==='recovering'&&switchBusy(status)?'配置已选择。正在恢复 ZTE 数据会话；Wi-Fi 保持开启。':({idle:'没有正在进行的配置切换。',card_busy:'卡正忙。Agent 最多会重试四分钟。',reloading:'卡已接受更改。正在等待 SIM 重新加载。',card_confirmed:'新配置已在卡上生效。正在等待调制解调器。',modem_confirmed:'调制解调器已加载新配置。正在等待数据通路恢复可用。',connected:status?.network_check==='ready'?'配置已选择，数据通路检查已通过。':status?.network_check==='unverified'?'配置与数据会话已设置。互联网接入尚未验证。':'卡、调制解调器与移动数据连接均已确认。',no_data:status?.reason==='network_unavailable'?'配置已更改，但无法确认互联网连接。请检查移动网络或重新连接移动数据。':status?.reason==='roaming_off' ? '配置已更改，但数据漫游已关闭。' : status?.reason==='data_off' ? '配置已更改，但移动数据已关闭。' : '配置已更改，但移动数据尚未连接。',modem_unconfirmed:'调制解调器尚未确认新配置。重试前请检查当前连接。',card_unconfirmed:'更改后无法读取卡。重试前请重新读取配置。',not_applied:'切换未生效；原配置仍处于活动状态。'}[status?.state] || '未上报切换状态。');
  const stepLabel=step=>({starting:'正在开始',es9p_initiate_authentication:'正在联系运营商',es10b_get_euicc_challenge:'正在读取卡挑战值',es10b_authenticate_server:'正在验证运营商',es9p_authenticate_client:'正在认证卡',es8p_metadata_parse:'正在读取配置详情',preview:'等待你的确认',es10b_prepare_download:'正在准备卡',es9p_get_bound_profile_package:'正在下载配置',es10b_load_bound_profile_package:'正在安装配置'}[step] || (step?.startsWith('es10b_load_bound_profile_package') ? '正在安装配置' : '正在与运营商和卡交互'));
  const api={switchBusy,downloadBusy,name,iccid,inventory,older,nickname,activation,warnings,switchMessage,stepLabel};if(typeof module==='object'&&module.exports)module.exports=api;else globalThis.OpenU60Esim=api;
})();
