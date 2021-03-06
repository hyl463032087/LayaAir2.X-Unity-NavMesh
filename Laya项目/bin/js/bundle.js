(function () {
	'use strict';

	class NavMeshAgent extends Laya.Script{
		constructor(){
			super();

			this.navMeshGroup=null;
			this.enabled=false;
			this.updateRotation=false;
			this._pathPending=false;
			//路线进行中
			this._path=null;
			this._pathp=0;
			this._pathlen=0;
			this._remainingDistance=1;
			this.destination=null;
			this.speed=1;
			this.steeringTarget=new Laya.Vector3();
			this._velocity=new Laya.Vector3();
			this.out=new Laya.Vector3();
		}

		onUpdate(){
			if (this.enabled){
				var now=this.owner.transform.position;
				if (this._path){
					var v=new Laya.Vector3;
					var tp=null;
					for (var i=this._pathp;i < this._path.length-1;i++){
						var p0=this._path[i];
						var p1=this._path[i+1];
						this._pathlen=this._pathlen+this.speed/60;
						var tlen=Laya.Vector3.distance(p0,p1);
						if (this._pathlen>tlen){
							this._pathlen-=tlen;
							this._pathp++;
							}else{
							tp=p0.clone();
							p1.cloneTo(this.steeringTarget);
							Laya.Vector3.subtract(p1,p0,v);
							Laya.Vector3.normalize(v,v);
							Laya.Vector3.scale(v,this._pathlen,v);
							Laya.Vector3.add(p0,v,tp);
							break ;
						}
					}
					if (tp==null){
						this._pathPending=false;
						tp=this._path[this._path.length-1];
						this._path[this._path.length-1].cloneTo(this.steeringTarget);
					}
					this.owner.transform.position=tp;
					}else{
					this.out.x=now.x+this.velocity.x *Laya.timer.delta/1000;
					this.out.y=now.y+this.velocity.y *Laya.timer.delta/1000;
					this.out.z=now.z+this.velocity.z *Laya.timer.delta/1000;
					if (this.navMeshGroup==null){
						this.out.cloneTo(now);
						this.owner.transform.position=now;
					}
				}
			}
		}
		get remainingDistance(){
			if (this.destination&&this.owner){
				return Vector3.distance(this.destination,this.owner.transform.position);
			}
			return this._remainingDistance;
		}
		set remainingDistance(value){
			this._remainingDistance=value;
		}

		get velocity(){
			return this._velocity;
		}
		set velocity(value){
			this._velocity=value;
			this.destination=null;
		}

		get path(){
			return this._path;
		}
		set path(value){
			this._path=value;
			if(value){
				this._pathPending=true;
				}else{
				this._pathPending=false;
			}
			this._pathp=0;
			this._pathlen=0;
		}
	}

	class Geometry extends Laya.Script{
		constructor(){
			super();
			this.faces=[];
			this.vertices=[];
		}

		/*
		*Checks for duplicate vertices with hashmap.
		*Duplicated vertices are removed
		*and faces' vertices are updated.
		*/
		mergeVertices(){
			var verticesMap={};
			var unique=new Array,changes=[];
			var v,key;
			var precisionPoints=4;
			var precision=Math.pow(10,precisionPoints);
			var i,il,face;
			var indices,j,jl;
			for (i=0,il=this.vertices.length;i < il;i++){
				v=this.vertices[ i];
				key=Math.round(v.x *precision)+'_'+Math.round(v.y *precision)+'_'+Math.round(v.z *precision);
				if (verticesMap[ key]==null){
					verticesMap[ key]=i;
					unique.push(v);
					changes[ i]=unique.length-1;
					}else {
					changes[ i]=changes[ verticesMap[ key]];
				}
			};
			var faceIndicesToRemove=[];
			for (i=0,il=this.faces.length;i < il;i++){
				face=this.faces[ i];
				face.a=changes[ face.a];
				face.b=changes[ face.b];
				face.c=changes[ face.c];
				indices=[ face.a,face.b,face.c];
				var dupIndex=-1;
				for (var n=0;n < 3;n++){
					if (indices[ n]==indices[ (n+1)% 3]){
						dupIndex=n;
						faceIndicesToRemove.push(i);
						break ;
					}
				}
			}
			for (i=faceIndicesToRemove.length-1;i >=0;i--){
				var idx=faceIndicesToRemove[ i];
				this.faces.splice(idx,1);
			};
			var diff=this.vertices.length-unique.length;
			this.vertices=unique;
			return diff;
		}
	}

	/**
	*
	* @ author:Carson
	* @ email:976627526@qq.com
	* @ data: 2019-11-17 20:00
	*/
	class Face extends Laya.Script {

	    constructor(a,b,c) {
	        super();
	        this.c=0;
			this.b=0;
			this.a=0;
			this.c=c;
			this.b=b;
			this.a=a;
	    }
	}

	/**
	*
	* @ author:Carson
	* @ email:976627526@qq.com
	* @ data: 2019-11-17 12:50
	*/
	class NavTest extends Laya.Script {

	    constructor() {
	        super();
	    }
	    onAwake(){
	        Laya.Scene3D.load("res/scene/LayaScene_LayaNavMesh/Conventional/LayaNavMesh.ls",Laya.Handler
		.create(this,this.onSceneLoadFinish));
		
			//创建射线
			this.ray=new Laya.Ray(new Laya.Vector3(),new Laya.Vector3());
			//射线检测结果
			this.hitResult=new Laya.HitResult(); 
	    }
	    onSceneLoadFinish(sceneLoad){
	        Laya.stage.addChild(sceneLoad);
			sceneLoad.zOrder=-1;
			this.scene=sceneLoad;
	        this.player=sceneLoad.getChildByName("player");
			this.physicsSimulation=sceneLoad.physicsSimulation;

			this.navUrl="meshes/outfile.js";
			this.camera= sceneLoad.getChildByName("Main Camera");
			this.agent=null;
			this.agent=this.player.addComponent(NavMeshAgent);
	        this.agent.speed=10;
	        
			Laya.loader.load(this.navUrl,Laya.Handler.create(this,this.onNavLoaded),null,"json");
		}

		onNavLoaded(){
			var json=Laya.loader.getRes(this.navUrl);
			var p2=json.vertices;
			var ii=json.faces;
			var faces=[];
			for (var i=0;i < ii.length/5;i++){
				faces.push(new Face(ii[i*5+1],ii[i*5+2],ii[i*5+3]));
			};
			var p=[];
			for (i=0;i < p2.length;i+=3){
				p.push(new Laya.Vector3(p2[i],p2[i+1],p2[i+2]));
			};
			
			//启动会在场景中生成可以移动的点
			/*for(var i=0;i<p.length;i++){
				var temp= new Laya.MeshSprite3D(Laya.PrimitiveMesh.createBox(1,1,1));
				temp.transform.position=new Laya.Vector3(p[i].x,0.5,p[i].z);
				this.scene.addChild(temp);
			}*/

			var g=new Geometry();
			g.faces=faces;
			g.vertices=p;
			var zoneNodes=Laya.Browser.window.patrol.buildNodes(g);
			Laya.Browser.window.patrol.setZoneData('level',zoneNodes);
			this.playerNavMeshGroup=Laya.Browser.window.patrol.getGroup('level',this.player.transform.position);
			
			Laya.stage.on("click",this,this.onClick);
		}

		onClick(){
			//将屏幕坐标转化为射线
	        this.camera.viewportPointToRay(new Laya.Vector2(Laya.stage.mouseX,Laya.stage.mouseY),this.ray);
	        if(this.physicsSimulation.rayCast(this.ray,this.hitResult)){
				console.log("000");
				this.targetPos=this.hitResult.point;
				var calculatedPath=Laya.Browser.window.patrol.findPath(this.player.transform.position,this.targetPos,'level',this.playerNavMeshGroup);
				if (calculatedPath && calculatedPath.length){
					var debugPath=(calculatedPath);
					console.log("start",this.player.transform.position.x,this.player.transform.position.y,this.player.transform.position.z);
					var p=[];
					for (var i=0;i < debugPath.length;i++){
						console.log(debugPath[i].x,debugPath[i].y,debugPath[i].z);
						p.push(new Laya.Vector3(debugPath[i].x,debugPath[i].y+.1,debugPath[i].z));
					}
					
					this.agent.path=[this.player.transform.position].concat(p);
					this.agent.enabled=true;
					console.log("end",this.targetPos.x,this.targetPos.y,this.targetPos.z);
				}
				else{
						this.agent.enabled=false;
				}
			}
		}
	}

	/**This class is automatically generated by LayaAirIDE, please do not make any modifications. */

	class GameConfig {
	    static init() {
	        //注册Script或者Runtime引用
	        let reg = Laya.ClassUtils.regClass;
			reg("NavMeshAgent/NavTest.js",NavTest);
	    }
	}
	GameConfig.width = 640;
	GameConfig.height = 1136;
	GameConfig.scaleMode ="fixedwidth";
	GameConfig.screenMode = "none";
	GameConfig.alignV = "top";
	GameConfig.alignH = "left";
	GameConfig.startScene = "main.scene";
	GameConfig.sceneRoot = "";
	GameConfig.debug = false;
	GameConfig.stat = false;
	GameConfig.physicsDebug = false;
	GameConfig.exportSceneToJson = true;

	GameConfig.init();

	class Main {
		constructor() {
			//根据IDE设置初始化引擎		
			if (window["Laya3D"]) Laya3D.init(GameConfig.width, GameConfig.height);
			else Laya.init(GameConfig.width, GameConfig.height, Laya["WebGL"]);
			Laya["Physics"] && Laya["Physics"].enable();
			Laya["DebugPanel"] && Laya["DebugPanel"].enable();
			Laya.stage.scaleMode = GameConfig.scaleMode;
			Laya.stage.screenMode = GameConfig.screenMode;
			Laya.stage.alignV = GameConfig.alignV;
			Laya.stage.alignH = GameConfig.alignH;
			//兼容微信不支持加载scene后缀场景
			Laya.URL.exportSceneToJson = GameConfig.exportSceneToJson;

			//打开调试面板（通过IDE设置调试模式，或者url地址增加debug=true参数，均可打开调试面板）
			if (GameConfig.debug || Laya.Utils.getQueryString("debug") == "true") Laya.enableDebugPanel();
			if (GameConfig.physicsDebug && Laya["PhysicsDebugDraw"]) Laya["PhysicsDebugDraw"].enable();
			if (GameConfig.stat) Laya.Stat.show();
			Laya.alertGlobalError = true;

			//激活资源版本控制，version.json由IDE发布功能自动生成，如果没有也不影响后续流程
			Laya.ResourceVersion.enable("version.json", Laya.Handler.create(this, this.onVersionLoaded), Laya.ResourceVersion.FILENAME_VERSION);
		}

		onVersionLoaded() {
			//激活大小图映射，加载小图的时候，如果发现小图在大图合集里面，则优先加载大图合集，而不是小图
			Laya.AtlasInfoManager.enable("fileconfig.json", Laya.Handler.create(this, this.onConfigLoaded));
		}

		onConfigLoaded() {
			//加载IDE指定的场景
			GameConfig.startScene && Laya.Scene.open(GameConfig.startScene);
		}
	}
	//激活启动类
	new Main();

}());
