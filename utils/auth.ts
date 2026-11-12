export function get_auth_status(context) {
    var dopath = context.request.url.split("/api/write/items/")[1]
    if(context.env["GUEST"]){
        if(dopath.startsWith("_$flaredrive$/thumbnails/"))return true;
        const allow_guest = context.env["GUEST"].split(",")
        for (var aa of allow_guest){
            if(aa == "*"){
                return true
            }else if(dopath.startsWith(aa)){
                return true
            }
        }
    }
    var headers = new Headers(context.request.headers);
    if(!headers.get('Authorization'))return false
    const Authorization=headers.get('Authorization').split("Basic ")[1]
    const account = atob(Authorization);
    if(!account)return false
    if(!context.env[account])return false
    if(dopath.startsWith("_$flaredrive$/thumbnails/"))return true;
    const allow = context.env[account].split(",")
    for (var a of allow){
        if(a == "*"){
            return true
        }else if(dopath.startsWith(a)){
            return true
        }
    }
    return false;
  }

// 检查读取权限（查看和下载）
export function get_read_auth_status(context, path) {
    // 缩略图始终允许访问
    if(path.startsWith("_$flaredrive$/thumbnails/")) return true;
    
    // 检查是否配置了 GUEST_READ 环境变量（游客可读目录）
    if(context.env["GUEST_READ"]){
        const allow_guest_read = context.env["GUEST_READ"].split(",")
        for (var aa of allow_guest_read){
            if(aa == "*"){
                return true
            }else if(path.startsWith(aa)){
                return true
            }
        }
    }
    
    // 检查用户认证
    var headers = new Headers(context.request.headers);
    if(!headers.get('Authorization')) return false;
    
    const Authorization = headers.get('Authorization').split("Basic ")[1]
    const account = atob(Authorization);
    if(!account) return false;
    if(!context.env[account]) return false;
    
    // 用户有权限的目录可以读取
    const allow = context.env[account].split(",")
    for (var a of allow){
        if(a == "*"){
            return true
        }else if(path.startsWith(a)){
            return true
        }
    }
    
    return false;
}
  