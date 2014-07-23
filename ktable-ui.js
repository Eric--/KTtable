//
// 金蝶软件（中国）有限公司版权所有.
// 
// Along 创建于 2012-9-21 
//

//import jQuery
//import ktable-model.js
//import ktable.js


/**
 * 表格控件的UI
 * 这是一个用DIV作为单元格的实现
 */
function KTableUI(oTable)
{
	KTableUI.INSERT_COL = "insertColumn";
	KTableUI.REMOVE_COL = "removeColumn";
	KTableUI.INSERT_ROW = "insertRow";
	KTableUI.REMOVE_ROW = "removeRow";
	KTableUI.ADD_MERGEBLOCK = "addMergeBlock";
	KTableUI.REMOVE_MERGEBLOCK = "removeMergeBlock";
	
	KTableUI.FROZEN_ROW = "frozenRow";
	KTableUI.FROZEN_COL = "frozenCol";
	
	//z-index
	var LAYER_MAIN_VIEW = 0;
	var LAYER_FROZEN_VIEW = 1;
	var LAYER_CORNER_VIEW = 2;
	var LAYER_POPUP_MENU = 64;
	var LAYER_PROMPT = 128;
	
	var _this = this;
	
	var _oTable = oTable;
	
	var _jqContainer = $("<div>");//主容器，组合以下各视图
	var _oMainView;//主视图
	var _oFrozenTopView;//上部冻结区域
	var _oFrozenLeftView;//左边冻结区域
	var _oFrozenCornerView;//上和左的交汇区域
	
	var _jqPopupMenu;//用于联查的弹出菜单
	
	var _jqPromptForLazyAppendData;//动态添加数据的等待提示
	
	var _bSyncUI = true;//模型改变时是否自动同步UI
	var _bScrollDynamicRepaint = false;//滚动时动态增减DOM对象
	
	var _oListenerProxy = new KTListenerProxy();
	
	//==>改成静态
	//var _arrStyleNode = []; 
	//var _oMapsCssName;// = new KTStyleManager.MultiMaps();//记录已创建的CSS的类名

	var _arrRowY = [];//所有行的起始位置
	var _arrColX = [];//所有列的起始位置

	var init = function()
	{
		//一个单元格上的样式是行、列、单元格上分别定义的并集，且属性存在重复时，单元格 > 列 > 行 > 表格。
		//由于CSS的覆盖规则是以style节点后出现为准，与使用DOM元素class="a b c"的名称先后无关。
		//所以采用有序的多个style节点来解决。
		//2013-4-7又注：IE的styleSheets只能到31个，改用所有实例共享四个<Style>
		if(!KTableUI.sStyleNodeIdPrefix)
		{
			KTableUI.sStyleNodeIdPrefix = "_ktable_style_";
			var jqHead = $("head");
			var sId = KTableUI.sStyleNodeIdPrefix + KTStyleManager.PRIORITY_TABLE;
			jqHead.append($('<style type="text/css" id="' + sId + '">'));
			
			sId = KTableUI.sStyleNodeIdPrefix + KTStyleManager.PRIORITY_ROW;
			jqHead.append($('<style type="text/css" id="' + sId + '">'));
			
			sId = KTableUI.sStyleNodeIdPrefix + KTStyleManager.PRIORITY_COLUMN;
			jqHead.append($('<style type="text/css" id="' + sId + '">'));
			
			sId = KTableUI.sStyleNodeIdPrefix + KTStyleManager.PRIORITY_CELL;
			jqHead.append($('<style type="text/css" id="' + sId + '">'));
		}
		
		_oTable.getSelectionModel().addChangeListener(selectionChangeHandler);
	}
	
	/** 取得控件的UI--HTML对象 */
	this.getHtmlElement = function()
	{
		if(!isUICreated())
		{
			_jqContainer.css("overflow", "hidden");
			_jqContainer.css("white-space", "nowrap");
			
			var jqMainView = getMainView().getUI();
			jqMainView.attr("id", _oTable.getId() + getMainView().getName());
			jqMainView.css("position", "absolute");
			jqMainView.css("left", 0);
			jqMainView.css("top", 0);
			jqMainView.width("100%");//IE6不支持left/right同时存在
			jqMainView.height("100%");
			jqMainView.css("z-index", LAYER_MAIN_VIEW);
			jqMainView.appendTo(_jqContainer);
			
			createFrozenView();
		}
		return _jqContainer[0];
	}
	
	/** 设置滚动条是否出现，分水平和垂直二个方向，取值:"hidden"/"auto"/"scroll" */
	this.setScrollerVisible = function(sHorizontalValue, sVarticalValue, funCustomSetter)
	{
		var jqMainView = getMainView().getUI();
		jqMainView.css("overflow-x", (sHorizontalValue ? sHorizontalValue : "hidden"));
		jqMainView.css("overflow-y", (sVarticalValue ? sVarticalValue : "auto"));
		if(funCustomSetter)
		{
			funCustomSetter(jqMainView);
		}
	}

	var isUICreated = function()
	{
		return _jqContainer.children().length > 0;
	}
	
	var getMainView = function()
	{
		if(!_oMainView)
		{
			_oMainView = new KTableUIMainView(_oTable, new DependenceForView());
			_this.addListener("scroll", syncScrollHandler);
			
			_this.addListener("scroll", tryHideMenu);
			_this.addListener("mousedown", tryHideMenu);
			
			_this.addListener("mousedown", dragSelectBlockHandler);
			_this.addListener("mousemove", dragSelectBlockHandler);
			_this.addListener("mouseup", dragSelectBlockHandler);
		}
		return _oMainView;
	}
	
	
	/** 模型任一处改变，即时同步UI */
	this.setSyncUIWhenModelChanged = function(b)
	{
		_bSyncUI = b;
	}
	this.isSyncUIWhenModelChanged = function()
	{
		return _bSyncUI;
	}
	
	/** 可以针对大数据量，设置滚动过程动态重绘 */
	this.setScrollDynamicRepaint = function(b)
	{
		if(_bScrollDynamicRepaint != b)
		{
			_bScrollDynamicRepaint = b;
			if(isUICreated())
			{
				this.updateUI();
			}
		}
	}
	this.isScrollDynamicRepaint = function()
	{
		return _bScrollDynamicRepaint;
	}
	
	/** 创建或重新生成UI */
	this.updateUI = function()
	{
		autoAdjustColumnWidth();
		
//		_oMapsCssName = new KTStyleManager.MultiMaps();
//		for(var i = 0; i < _arrStyleNode.length; i++)
//		{
////			var jqStyle = _arrStyleNode[i];
////			jqStyle.text("");
//			updateStyleNode(i, false);
//		}
		
		calculateAllColX(-1);
		calculateAllRowY(-1);
		
		getMainView().updateUI();
		relayout();
		if(_oFrozenTopView)
		{
			_oFrozenTopView.updateUI();
		}
		if(_oFrozenLeftView)
		{
			_oFrozenLeftView.updateUI();
		}
		if(_oFrozenCornerView)
		{
			_oFrozenCornerView.updateUI();
		}
	}
	
	var updateStyleNode = function(iPriority, bAddOtherwiseClear, sClassName, sCss)
	{
		var sStyleNodeId = KTableUI.sStyleNodeIdPrefix + iPriority;
		var htmlStyleSheet;
		for(var i = document.styleSheets.length - 1; i >= 0; i--)
		{
			var styleSheet = document.styleSheets[i];
			var sId = styleSheet.id || styleSheet.id == "" ? styleSheet.id : styleSheet.ownerNode.id;//不同浏览器有差异
			if(sId == sStyleNodeId)
			{
				htmlStyleSheet = styleSheet;
				break;
			}
		}
		if(bAddOtherwiseClear)
		{
			if(htmlStyleSheet.addRule)//不同浏览器有差异
			{
				htmlStyleSheet.addRule(sClassName, sCss);
			}
			else
			{
				var sRule = sClassName + "{" + sCss + "}";
				var iIdx = htmlStyleSheet.cssRules.length;
				htmlStyleSheet.insertRule(sRule, iIdx);
			}
		}
		else
		{
			//只增不减，以下全注释掉
//			var iRulesCount = (htmlStyleSheet.cssRules || htmlStyleSheet.rules).length;//不同浏览器有差异
//			for(var i = iRulesCount - 1; i >= 0; i--)
//			{
//				if(htmlStyleSheet.deleteRule)//不同浏览器有差异
//				{
//					htmlStyleSheet.deleteRule(i);
//				}
//				else
//				{
//					htmlStyleSheet.removeRule(i);
//				}
//			}
		}
	}
	
//	//IE6/7/8的<Style>节点是只读的，连innerHTML都不能改。但整个节点替换可行。
//	var updateStyleNode1 = function(iPriority, bAddOtherwiseReplace, sCss)
//	{
//		var sNew;
//		var jqStyle = _arrStyleNode[iPriority];
//		if(bAddOtherwiseReplace)
//		{
//			var sOld = jqStyle[0].innerHTML;//IE8系列text()取不到...
//			sNew = sOld + sCss;
//		}
//		else
//		{
//			sNew = sCss;
//		}
//		var jqStyleNew = $('<style type="text/css">' + sNew + '</style>');
//		jqStyleNew.attr("id", jqStyle.attr("id"));//此标识无实际意义
//		jqStyle.replaceWith(jqStyleNew);
//		_arrStyleNode[iPriority] = jqStyleNew;
//	}
	
	/** 开启或关闭动态添加数据提示 */
	this.showPromptForLazyAppendData = function(bShow)
	{
		if(bShow)
		{
			if(!_jqPromptForLazyAppendData)
			{
				//大DIV蒙住使不可操作
				_jqPromptForLazyAppendData = $('<div style="position:absolute; left:0; right:0; top:0; bottom:0">');
				_jqPromptForLazyAppendData.css("z-index", LAYER_PROMPT);

				//半透明效果不能设置在大DIV上，会影响子对象小DIV，所以做成兄弟。
				var jqBackground = $('<div style="position:absolute; left:0; right:0; top:0; bottom:0">');
				jqBackground.css("background-color", "#CCCCCC");
				jqBackground.css("opacity", 0.5);
				jqBackground.appendTo(_jqPromptForLazyAppendData);
				
				//小DIV带样式,显示文字
				var jqText = $("<div>");
				jqText.css("position", "absolute");
				jqText.width(120);
				jqText.height(20);
				jqText.css("padding", 10);
				jqText.css("background-color", "#D0E3F6");
				jqText.css("border", "1px solid #97B3CB");
				jqText.text("数据加载中...");
				jqText.appendTo(_jqPromptForLazyAppendData);
			}
			_jqPromptForLazyAppendData.appendTo(_jqContainer);
			var jqText = _jqPromptForLazyAppendData.find(":last-child");
			jqText.css("left", (_jqContainer.width() - jqText.width()) / 2);
			jqText.css("top", (_jqContainer.height() - jqText.height()) / 2);
		}
		else
		{
			if(_jqPromptForLazyAppendData)
			{
				_jqPromptForLazyAppendData.remove();
			}
		}
	}
	
	/** 滚动到底部，添加数据后，调此接口重绘 */
	this.repaintAfterLazyAppendData = function(iFromRowIdx)
	{
		calculateAllRowY(iFromRowIdx);
		getMainView().repaint();
		getMainView().adjustFootPlaceholder();
		if(_oFrozenLeftView)
		{
			_oFrozenLeftView.repaint();
			_oFrozenLeftView.adjustFootPlaceholder();
		}
	}

	var autoAdjustRowHeight = function(iFromRowIdx)
	{
		if(!oTable.isAutoAdjustRowHeight())//行高自适应
		{
			return;
		}
		iFromRowIdx = (iFromRowIdx >= 0 ? iFromRowIdx : 0);
		var iAdjustedHeightDeltaSum = 0;
		for(var i = iFromRowIdx, ic = _arrRowY.length - 1; i < ic; i++)
		{
			var oRow = _oTable.getRow(i);
			if(oRow.isHide())
			{
				continue;
			}
			var iAdjustedHeight = 0;
			for(var j = 0, jc = _oTable.getColumnsCount(); j <= jc; j++)
			{
				var oCell = oRow.getCellForDraw(j);
				if(!oCell)
				{
					continue;
				}
				var oCol = _oTable.getColumn(j);
				if(!_oTable.getStyleValue(oCell, oCol, oRow, "getStyle", "isWrapText", false))
				{
					continue;
				}
				var iCurrentCellHeight = tryoutDrawCellHeight(i, j, oRow, oCol, oCell);
				iAdjustedHeight = (iCurrentCellHeight > iAdjustedHeight ? iCurrentCellHeight : iAdjustedHeight);
			}
			var iHeightPreValue = oRow.getHeight();
			if(iAdjustedHeight > iHeightPreValue)
			{
				var iDelta = iAdjustedHeight - iHeightPreValue;
				iAdjustedHeightDeltaSum += iDelta;
			}
			_arrRowY[i + 1] = _arrRowY[i + 1] + iAdjustedHeightDeltaSum;
		}
	}
	
	//用render画--真实添加在DOM树上，取得高度后即擦掉
	var tryoutDrawCellHeight = function(iRowIdx, iColIdx, oRow, oCol, oCell)
	{
		var oMergeBlock;
		var arrMergeBlocks = _oTable.getMergeBlocks();
		for(var i = 0; i < arrMergeBlocks.length; i++)
		{
			var oMB = arrMergeBlocks[i];
			if(iRowIdx >= oMB.getRowIdxFrom() && iRowIdx <= oMB.getRowIdxTo()
				&& iColIdx >= oMB.getColIdxFrom() && iColIdx <= oMB.getColIdxTo())
			{
				oMergeBlock = (iRowIdx == oMB.getRowIdxFrom() && iColIdx == oMB.getColIdxFrom()) ? oMB : null;
				break;
			}
		}
		if(oMergeBlock === null)
		{
			return 0;
		}

		var iCellWidth = (oMergeBlock 
			? _arrColX[oMergeBlock.getColIdxTo() + 1] - _arrColX[oMergeBlock.getColIdxFrom()]
			: oCol.getWidth());
		var iTextWidth = iCellWidth - 4;//简单粗暴认为左右边框2
		if(iTextWidth < 0)
		{
			return 0;
		}
		
		var sClassName = buildStyle(oRow, oCol, oCell);
		var oRender = _oTable.getCellRender();
		oRender.setContext(oRow, oCol, oCell, iRowIdx, iColIdx, NaN, NaN, iTextWidth, NaN, null);
		var iHeight = oRender.calculateCellHeight(sClassName);
		if(oMergeBlock)
		{
			//融合块算出的高度，减去非首行的原始高度，剩余用于主格所在行
			iHeight -= (_arrRowY[oMergeBlock.getRowIdxTo() + 1] - _arrRowY[oMergeBlock.getRowIdxFrom() + 1]);
			iHeight = (iHeight < 0 ? 0 : iHeight);
		}
		return iHeight + 4;//简单粗暴加上上下边框线宽
	}
	
	var calculateAllRowY = function(iFromRowIdx)
	{
		var iRowsCount = _oTable.getRowsCount();
		if(_arrRowY.length > iRowsCount + 1)
		{
			_arrRowY.length = iRowsCount + 1;
		}
		
		var iAddY = (iFromRowIdx >= 0 ? _arrRowY[iFromRowIdx] : 0);
		iFromRowIdx = (iFromRowIdx >= 0 ? iFromRowIdx : 0);
		for(var i = iFromRowIdx; i < iRowsCount; i++)
		{
			_arrRowY[i] = iAddY;
			var oRow = _oTable.getRow(i);
			if(!oRow.isHide())
			{
				var iHeight = oRow.getHeight();
				iAddY += iHeight;
			}
		}
		_arrRowY[iRowsCount] = iAddY;//对于任意一行k，可以用k+1取下沿。
		
		autoAdjustRowHeight(iFromRowIdx);
	}
	
	var calculateAllColX = function(iFromColIdx)
	{
		var iColsCount = _oTable.getColumnsCount();
		if(_arrColX.length > iColsCount + 1)
		{
			_arrColX.length = iColsCount + 1;
		}
		
		var iAddX = (iFromColIdx >= 0 ? _arrColX[iFromColIdx] : 0);
		iFromColIdx = (iFromColIdx >= 0 ? iFromColIdx : 0);
		for(var j = iFromColIdx; j < iColsCount; j++)
		{
			_arrColX[j] = iAddX;
			var oCol = _oTable.getColumn(j);
			if(!oCol.isHide())
			{
				var iWidth = oCol.getWidth();
				iAddX += iWidth;
			}
		}
		_arrColX[iColsCount] = iAddX;
	}
	
	//二分法，从垂直坐标值取行序号。
	var searchRowIdx = function(iScrollY)
	{
		if(!_arrRowY || _arrRowY.length <= 1)
		{
			return -1;
		}
		return dichotomicSearchRowOrColIdx(_arrRowY, iScrollY);
	}
	
	//从坐标值(x,y)查找行列序号[iRowIdx, iColIdx]
	var searchCell = function(iX, iY)
	{
		if(!_arrColX || _arrColX.length <= 1 || !_arrRowY || _arrRowY.length <= 1)
		{
			return null;
		}
		if(iX >= _arrColX[_arrColX.length - 1] || iY >= _arrRowY[_arrRowY.length - 1])
		{
			return null;
		}
		
		var iColIdx = dichotomicSearchRowOrColIdx(_arrColX, iX);
		while(_arrColX[iColIdx] > iX && iColIdx > 0)//考虑算法不“准”，也考虑隐藏
		{
			iColIdx -= 1;
		}
		while(_arrColX[iColIdx + 1] <= iX && iColIdx < _arrColX.length - 2)//考虑隐藏
		{
			iColIdx += 1;
		}
		
		var iRowIdx = dichotomicSearchRowOrColIdx(_arrRowY, iY);
		while(_arrRowY[iRowIdx] > iY && iRowIdx > 0)
		{
			iRowIdx -= 1;
		}
		while(_arrRowY[iRowIdx + 1] <= iY && iRowIdx < _arrRowY.length - 2)
		{
			iRowIdx += 1;
		}
		
		return [iRowIdx, iColIdx]
	}
	
	var dichotomicSearchRowOrColIdx = function(arrColXOrRowY, iXOrY)
	{
		var arrIdxRange = [0, arrColXOrRowY.length - 2];//N行会有N+1个值
		while(arrIdxRange)
		{
			var iFromIdx = arrIdxRange[0];
			var iToIdx = arrIdxRange[1];
			if(iFromIdx == iToIdx)
			{
				return iFromIdx;
			}
			var iMidIDx = (iFromIdx + iToIdx) >> 1;//除以2取整
			if(arrColXOrRowY[iMidIDx] == iXOrY)
			{
				return iMidIDx;
			}
			else if(arrColXOrRowY[iMidIDx] < iXOrY)
			{
				//由于向下取整，不存在(iMidIDx + 1 > iToIdx)
				arrIdxRange[0] = iMidIDx + 1;
				arrIdxRange[1] = iToIdx;
			}
			else if(arrColXOrRowY[iMidIDx] > iXOrY)
			{
				if(iMidIDx - 1 < iFromIdx)
				{
					return iMidIDx;//即iFromIdx
				}
				arrIdxRange[0] = iFromIdx;
				arrIdxRange[1] = iMidIDx - 1;
			}
		}
		//更精确的做法是再判断最接近的一个，或小于/大于的一个。
	}
	
	/**
	 * 模型结构变化，通知UI更新
	 */
	this.modelChangeHandler = function(oModel, strType)
	{
		if(!_bSyncUI || !isUICreated())
		{
			return;
		}
		var bAskUpdateUI = getMainView().modelChangeHandler(oModel, strType);
		if(_oFrozenTopView)
		{
			var bAskUpdateUI = bAskUpdateUI || _oFrozenTopView.modelChangeHandler(oModel, strType);
		}
		if(_oFrozenLeftView)
		{
			var bAskUpdateUI = bAskUpdateUI || _oFrozenLeftView.modelChangeHandler(oModel, strType);
		}
		if(_oFrozenCornerView)
		{
			var bAskUpdateUI = bAskUpdateUI || _oFrozenCornerView.modelChangeHandler(oModel, strType);
		}
		if(bAskUpdateUI)
		{
			this.updateUI();
		}
	}
	
	/**
	 * 模型属性变化，通知UI更新
	 * @param oModel: 发生属性变化的模型对象或信息封装
	 * @param strPropertyName: 属性名称
	 * @param value: 新值
	 * @param oldValue: 变化前的旧值
	 */
	this.propertyChangeHandler = function(oModel, strPropertyName, value, oldValue)
	{
		if(!_bSyncUI || !isUICreated())
		{
			return;
		}
		
		switch(strPropertyName)
		{
			case KTableUI.FROZEN_ROW:
			case KTableUI.FROZEN_COL:
				createFrozenView();
				this.updateUI();
				break;
			case KTRow.HIDE:
				var iRowIdx = _oTable.getRowIndex(oModel);
				calculateAllRowY(iRowIdx);
				callViewsPropertyChangeHandler(oModel, strPropertyName, value, oldValue);
				relayout();
				syncTopViewScroll();
				syncLeftViewScroll();
				break;
			case KTColumn.HIDE:
				var iColIdx = _oTable.getColumnIndex(oModel);
				calculateAllColX(iColIdx);
				callViewsPropertyChangeHandler(oModel, strPropertyName, value, oldValue);
				relayout();
				syncTopViewScroll();
				syncLeftViewScroll();
				break;
			default:
				callViewsPropertyChangeHandler(oModel, strPropertyName, value, oldValue);
		}
	}
	
	var callViewsPropertyChangeHandler = function(oModel, strPropertyName, value, oldValue)
	{
		var bAskUpdateUI = getMainView().propertyChangeHandler(oModel, strPropertyName, value, oldValue);
		if(_oFrozenTopView)
		{
			var bAskUpdateUI = bAskUpdateUI || 
				_oFrozenTopView.propertyChangeHandler(oModel, strPropertyName, value, oldValue);
		}
		if(_oFrozenLeftView)
		{
			var bAskUpdateUI = bAskUpdateUI ||
				_oFrozenLeftView.propertyChangeHandler(oModel, strPropertyName, value, oldValue);
		}
		if(_oFrozenCornerView)
		{
			var bAskUpdateUI = bAskUpdateUI ||
				_oFrozenCornerView.propertyChangeHandler(oModel, strPropertyName, value, oldValue);
		}
		if(bAskUpdateUI)
		{
			_this.updateUI();
		}
	}
	
	/**
	 * 添加事件监听
	 * @param strType 事件类型，如mousedown 
	 * @param funListener 形如：func(strType, MouseEventWrap)
	 */
	this.addListener = function(strType, funListener)
	{
		_oListenerProxy.addListener(strType, funListener);
	}
	
	/**
	 * 移除事件监听
	 */
	this.removeListener = function(strType, funListener)
	{
		_oListenerProxy.removeListener(strType, funListener);
	}
	
	//发事件
	var fireListener = function(strType, oEventWrap)
	{
		_oListenerProxy.fireListener(strType, oEventWrap);
	}
	
	var createFrozenView = function()
	{
		var iFrozenRows = _oTable.getFrozenRows();
		var iFrozenCols = _oTable.getFrozenColumns();
		var bHasTopView = (iFrozenRows > 0);
		var bHasLeftView = (iFrozenCols > 0);
		var bHasCornerView = (bHasTopView && bHasLeftView);
		if(bHasTopView && !_oFrozenTopView)
		{
			_oFrozenTopView = new KTableUITopFrozenView(_oTable, new DependenceForView());
			initFrozenView(_oFrozenTopView, LAYER_FROZEN_VIEW);
		}
		else if(!bHasTopView && _oFrozenTopView)
		{
			destroyFrozenView(_oFrozenTopView);
			_oFrozenTopView = null;
		}
		
		if(bHasLeftView && !_oFrozenLeftView)
		{
			_oFrozenLeftView = new KTableUILeftFrozenView(_oTable, new DependenceForView());
			initFrozenView(_oFrozenLeftView, LAYER_FROZEN_VIEW);
		}
		else if(!bHasLeftView && _oFrozenLeftView)
		{
			destroyFrozenView(_oFrozenLeftView);
			_oFrozenLeftView = null;
		}
		
		if(bHasCornerView && !_oFrozenCornerView)
		{
			_oFrozenCornerView = new KTableUICornerFrozenView(_oTable, new DependenceForView());
			initFrozenView(_oFrozenCornerView, LAYER_CORNER_VIEW);
		}
		else if(!bHasCornerView && _oFrozenCornerView)
		{
			destroyFrozenView(_oFrozenCornerView);
			_oFrozenCornerView = null;
		}
	}
	
	var initFrozenView = function(oView, iZIndex)
	{
		var jqView = oView.getUI();
		jqView.appendTo(_jqContainer);
		jqView.css("z-index", iZIndex);
		jqView.css("background-color", "#ffffff");
		jqView.css("top", 0);
		jqView.css("left", 0);
	}
	
	var destroyFrozenView = function(oView)
	{
		oView.getUI().remove();
		oView.destroy();
	}
	
	var relayout = function()
	{
		if(_oFrozenTopView)
		{
			//在此之前，主视图已先updateUI()，以下属性才能取到：
//			var iMainViewOffsetWidth = getMainView().getUI().prop("offsetWidth");
			var iMainViewClientWidth = getMainView().getUI().prop("clientWidth");
			
			var jqTopView = _oFrozenTopView.getUI();
			//若主视图的滚动条时有时无，此处right不能感知并随之变化。
//			if($.browser.msie && $.browser.version == "6.0")
//			{
				//IE6不能left/right同时存在
				jqTopView.width(iMainViewClientWidth);
//			}
//			else
//			{
//				jqTopView.css("right", iMainViewOffsetWidth - iMainViewClientWidth);
//			}
		}
		if(_oFrozenLeftView)
		{
//			var iMainViewOffsetHeight = getMainView().getUI().prop("offsetHeight");
			var iMainViewClientHeight = getMainView().getUI().prop("clientHeight");
			
			var jqLeftView = _oFrozenLeftView.getUI();
//			if($.browser.msie && $.browser.version == "6.0")
//			{
				//IE6不能top/bottom同时存在
				jqLeftView.height(iMainViewClientHeight);
//			}
//			else
//			{
//				jqLeftView.css("bottom", iMainViewOffsetHeight - iMainViewClientHeight);
//			}
		}
	}
	
	var syncScrollHandler = function(strType, oEventWrap)
	{
		if(oEventWrap.isHorizontalScroll())
		{
			syncTopViewScroll();
		}
		else
		{
			syncLeftViewScroll();
		}
	}
	
	var syncTopViewScroll = function()
	{
		if(_oFrozenTopView)
		{
			var iScrollLeft = getMainView().getUI().prop("scrollLeft");
			_oFrozenTopView.getUI().prop("scrollLeft", iScrollLeft);
		}
	}
	
	var syncLeftViewScroll = function()
	{
		if(_oFrozenLeftView)
		{
			var iScrollTop = getMainView().getUI().prop("scrollTop");
			_oFrozenLeftView.getUI().prop("scrollTop", iScrollTop);
			if(_this.isScrollDynamicRepaint())
			{
				_oFrozenLeftView.repaint();
			}
		}
	}
	
	/** 弹出菜单 */
	this.popupMenu = function(iX, iY, arrMenuItem, funAction, oCss)
	{
		tryHideMenu();
		if(!arrMenuItem || arrMenuItem.length == 0)
		{
			return;
		}
		var sBackgroundColor, sBorderColor, iFontSize, sSelectionColor
		if(oCss)
		{
			sBackgroundColor = oCss["background-color"];
			sBorderColor = oCss["border-color"];
			iFontSize = oCss["font-size"];
			sSelectionColor = oCss["selection-color"];//这个非CSS属性
		}
		//没有指定样式就用缺省值
		sBackgroundColor = sBackgroundColor ? sBackgroundColor : "#D0E3F6";//浅蓝
		sBorderColor = sBorderColor ? sBorderColor : "#97B3CB";//蓝
		iFontSize = iFontSize ? iFontSize : 12;
		sSelectionColor = sSelectionColor ? sSelectionColor : "#FFE358";//黄
		
		_jqPopupMenu = $("<div>");
		_jqPopupMenu.css("z-index", LAYER_POPUP_MENU);
		_jqPopupMenu.css("position", "absolute");
		_jqPopupMenu.css("cursor", "pointer");
		_jqPopupMenu.css("border", "1px solid");
		_jqPopupMenu.css("border-color", sBorderColor);
		_jqPopupMenu.css("background-color", sBackgroundColor);
		_jqPopupMenu.css("font-size", iFontSize);
		for(var i = 0; i < arrMenuItem.length; i++)
		{
			var oItem = arrMenuItem[i];
			var jqItem = $("<div>");
			jqItem.text(oItem.getText());
			jqItem.css("padding", 2);
			jqItem.click(createMenuClickHandler(funAction, oItem));
			jqItem.mouseover(
				function(evt)
				{
					$(evt.target).css("background-color", sSelectionColor);
				});
			jqItem.mouseout(
				function(evt)
				{
					$(evt.target).css("background-color", "");//清除
				});
			_jqPopupMenu.append(jqItem);
		}
		//先挂上去，就有了大小
		_jqContainer.append(_jqPopupMenu);
		//再调整位置（位于右下空间不够，则往前挤）
		if(iX + _jqPopupMenu.width() > _jqContainer.width())
		{
			_jqPopupMenu.width(_jqPopupMenu.width() + 2);//偶尔会莫明其妙自动折行
			iX = _jqContainer.width() - _jqPopupMenu.width() - 5;
			iX = iX < 0 ? 0 : iX;
		}
		if(iY + _jqPopupMenu.height() > _jqContainer.height())
		{
			iY = _jqContainer.height() - _jqPopupMenu.height() - 5;
			iY = iY < 0 ? 0 : iY;
		}
		_jqPopupMenu.css("left", iX);
		_jqPopupMenu.css("top", iY);
	}
	
	//一个闭包，保留菜单项的模型oItem，创建鼠标点击事件响应函数
	var createMenuClickHandler = function(funAction, oItem)
	{
		var funClickHandler = function(evt)
		{
			tryHideMenu();
			if(funAction)
			{
				funAction(oItem);
			}
		};
		return funClickHandler;
	}
	
	//尝试关闭弹出菜单
	var tryHideMenu = function()
	{
		if(_jqPopupMenu)
		{
			_jqPopupMenu.remove();
		}
	}
	
	//拖拽块选
	var _bDragStart = false;
	var _bDraging = false;
	var _oDragStartTarget = null;
	var dragSelectBlockHandler = function(sType, oEventWrap)
	{
		if(_oTable.getSelectionModel().getMode() == KTSelectionModel.MODE_NONE
			|| _oTable.getSelectionRender() === null)
		{
			return;
		}
		if(sType == "mousedown")
		{
			if(oEventWrap.isLeftButton())
			{
				var oMousePointed = oEventWrap.getMouseTargetModel();
				if(oMousePointed instanceof KTCell.Path)
				{
					_bDragStart = true;
					_oDragStartTarget = _oTable.getSelectionModel().createCellTarget(
						oMousePointed.getRowIndex(), oMousePointed.getColIndex());
				}
			}
		}
		else if(sType == "mouseup")
		{
			if(_bDraging)
			{
				dragingSelectionPrompt(null);
				var oDragingMousePointed = oEventWrap.getMouseTargetModel();
			 	if(oDragingMousePointed instanceof KTCell.Path)
			 	{
					var oTarget = _oTable.getSelectionModel().createCellTarget(
						oDragingMousePointed.getRowIndex(), oDragingMousePointed.getColIndex());
					if(!oTarget.equals(_oDragStartTarget))
					{
						_oTable.getSelectionModel().appendSelected(oTarget);
					}
				}
			}
			_bDraging = false;
			_bDragStart = false;
			_oDragStartTarget = null;
		}
		else if(sType == "mousemove")
		{
			if(_bDragStart && !_bDraging)
			{
				_bDraging = true;
			}
			if(_bDraging)
			{
				var oDragingMousePointed = oEventWrap.getMouseTargetModel();
				dragingSelectionPrompt(oDragingMousePointed);
			}
		}
	}
	
	var dragingSelectionPrompt = function(oDragingMousePointed)
	{
		var oBlockSelection = null;
		if(oDragingMousePointed instanceof KTCell.Path)
		{
			var oSelectionModel = _oTable.getSelectionModel();
			var oTarget = oSelectionModel.createCellTarget(
				oDragingMousePointed.getRowIndex(), oDragingMousePointed.getColIndex());
			var arrRange = oSelectionModel.parseBlockRange(oTarget);
			var arrLastRange = oSelectionModel.parseBlockRange(_oDragStartTarget);
			var iRowIdx1 = Math.min(Math.min(Math.min(arrRange[0], arrRange[2]), arrLastRange[0]), arrLastRange[2]);
			var iColIdx1 = Math.min(Math.min(Math.min(arrRange[1], arrRange[3]), arrLastRange[1]), arrLastRange[3]);
			var iRowIdx2 = Math.max(Math.max(Math.max(arrRange[0], arrRange[2]), arrLastRange[0]), arrLastRange[2]);
			var iColIdx2 = Math.max(Math.max(Math.max(arrRange[1], arrRange[3]), arrLastRange[1]), arrLastRange[3]);
			oBlockSelection = oSelectionModel.createBlockTarget(iRowIdx1, iColIdx1, iRowIdx2, iColIdx2);
		}
		_oMainView.showDragingMarkBundle(oBlockSelection);
		if(_oFrozenCornerView)
		{
			_oFrozenCornerView.showDragingMarkBundle(oBlockSelection);
		}
		if(_oFrozenLeftView)
		{
			_oFrozenLeftView.showDragingMarkBundle(oBlockSelection);
		}
		if(_oFrozenTopView)
		{
			_oFrozenTopView.showDragingMarkBundle(oBlockSelection);
		}
	}
	
	var selectionChangeHandler = function(strType, arrTargets)
	{
		if(strType != KTSelectionModel.CHANGE_ADD)
		{
			return;
		}
		//监听选中模型的改变事件，行列换算成UI坐标，再外发
		var arrRange = _oTable.getSelectionModel().parseBlockRange(arrTargets[0]);
		var iY1 = _arrRowY[arrRange[0]];//iStartRowIdx
		var iX1 = _arrColX[arrRange[1]];//iStartColIdx
		var iY2 = _arrRowY[arrRange[2] + 1];//iEndRowIdx
		var iX2 = _arrColX[arrRange[3] + 1];//iEndColIdx
		fireListener("new-select", [iX1, iY1, iX2, iY2]);
	}
	
	var autoAdjustColumnWidth = function()
	{
		if(!_oTable.isColumnFitVisibleWidth())
		{
			return;
		}
		var iOriAllWidth = 0;
		for(var j = 0, jc = _oTable.getColumnsCount(); j < jc; j++)
		{
			var oCol = _oTable.getColumn(j);
			if(!oCol.isHide())
			{
				iOriAllWidth += oCol.getWidth();
			}
		}
		var iWidthCanUse = _jqContainer.prop("clientWidth") - 1;
		var bSyncUIWhenModelChanged = _oTable.isSyncUIWhenModelChanged();
		_oTable.setSyncUIWhenModelChanged(false);
		var fRate = iWidthCanUse / iOriAllWidth;
		for(var j = 0, jc = _oTable.getColumnsCount(); j < jc; j++)
		{
			var oCol = _oTable.getColumn(j);
			if(!oCol.isHide())
			{
				var iWidth = parseInt(oCol.getWidth() * fRate);
				oCol.setWidth(iWidth);
				iWidthCanUse -= iWidth;
			}
		}
		if(iWidthCanUse > 0)
		{
			for(var j = _oTable.getColumnsCount() - 1; j >= 0; j--)
			{
				var oCol = _oTable.getColumn(j);
				if(!oCol.isHide())
				{
					oCol.setWidth(oCol.getWidth() + iWidthCanUse);
					break;
				}
			}	
		}
		_oTable.setSyncUIWhenModelChanged(bSyncUIWhenModelChanged);
	}
	
	var buildStyle = function(oRow, oCol, oCell)
	{
		var sClassNames = "";
		if(oCell)
		{
			sClassNames += buildCss(oCell.getStyle(), KTStyleManager.PRIORITY_CELL);
		}
		sClassNames += buildCss(oCol.getStyle(), KTStyleManager.PRIORITY_COLUMN);
		sClassNames += buildCss(oRow.getStyle(), KTStyleManager.PRIORITY_ROW);
		sClassNames += buildCss(_oTable.getStyle(), KTStyleManager.PRIORITY_TABLE);
		return sClassNames;
	}	
	
	var buildBorder = function(oRow, oCol, oCell)
	{
		var sClassNames = "";
		if(oCell)
		{
			sClassNames += buildCss(oCell.getBorder(), KTStyleManager.PRIORITY_CELL);
		}
		sClassNames += buildCss(oCol.getBorder(), KTStyleManager.PRIORITY_COLUMN);
		sClassNames += buildCss(oRow.getBorder(), KTStyleManager.PRIORITY_ROW);
		sClassNames += buildCss(_oTable.getBorder(), KTStyleManager.PRIORITY_TABLE);
		return sClassNames;
	}
	
	var buildCss = function(oStyle, iPriority)
	{
		if(!oStyle)
		{
			return "";
		}
		var strClassName = _oTable.getStyleManager().getShareStyleId(oStyle, iPriority);
		var mapCssName = KTableUI.oMapsCssName.getMap(iPriority);
		if(!mapCssName[strClassName])
		{
			mapCssName[strClassName] = true;
			updateStyleNode(iPriority, true, "." + strClassName, oStyle.toCssString());
		}
		return " " + strClassName;
	}
	
	/** 指定界面上一个点，让它所在的行、列或单元格选中，如果此点所在无内容，则返回false */
	this.selectByPoint = function(iScrollX, iScrollY)
	{
//		var iScrollX = iClientX + _oMainView.getUI().prop("scrollLeft");
//		var iScrollY = iClinetY + _oMainView.getUI().prop("scrollTop");
		var arrCellIdx = searchCell(iScrollX, iScrollY);
		if(!arrCellIdx)
		{
			return false;
		}
		var oSelectionModel = _oTable.getSelectionModel();
		if(oSelectionModel.isPolicySetting(KTSelectionModel.POLICY_ROW))
		{
			oSelectedTarget = oSelectionModel.createRowTarget(arrCellIdx[0]);
		}
		else if(oSelectionModel.isPolicySetting(KTSelectionModel.POLICY_COLUMN))
		{
			oSelectedTarget = oSelectionModel.createColumnTarget(arrCellIdx[1]);
		}
		else//POLICY_BLOCK or CELL
		{
			oSelectedTarget = oSelectionModel.createCellTarget(arrCellIdx[0], arrCellIdx[1]);
		}
		oSelectionModel.removeAllSelecteds();
		oSelectionModel.addSelected(oSelectedTarget);
		return true;
	}
	
	/**
	 * 封装接口给View
	 * （如果是JAVA，这应该是包内方法或interface）
	 */
	function DependenceForView()
	{
		this.fireEvent = function(strType, oEventWrap)
		{
			fireListener(strType, oEventWrap);
		}
		
		this.isScrollDynamicRepaint = function()
		{
			return _this.isScrollDynamicRepaint();
		}
		
		this.buildStyle = function(oRow, oCol, oCell)
		{
			return buildStyle(oRow, oCol, oCell)
		}
		
		this.buildBorder = function(oRow, oCol, oCell)
		{
			return buildBorder(oRow, oCol, oCell)
		}
		
		this.searchRowIdx = function(iScrollY)
		{
			return searchRowIdx(iScrollY);
		}
		
		this.searchCell = function(iX, iY)
		{
			return searchCell(iX, iY);
		}
		
		this.getRowY = function(iRowIdx)
		{
			return _arrRowY[iRowIdx];
		}
		
		this.getColX = function(iColIdx)
		{
			return _arrColX[iColIdx];
		}
	}
	
	init();
}
KTableUI.sStyleNodeIdPrefix = null;
KTableUI.oMapsCssName = new KTStyleManager.MultiMaps();

/**
 * 视图的抽象基类
 * --冻结行列部分和主视图都是它的子类
 */
function KTableUIAbstractView(oTable, oUiDependence)
{
	var LAYER_CELL_EMPTY = 1;
	var LAYER_CELL = 2;
	var LAYER_ALLCELL = 1;//所有CELL的容器
	var LAYER_SELECTION_MARK = 64;//选中标记的层
	var LAYER_EMBED_OBJECT = 128;//嵌入对象的层
	
	var UIMARK = "ktableUiMark";
	var UIMARK_TREE_HANDLER = "treeHandler";
	var UIMARK_TEXT_SPAN = "textSpan";
	var UIMARK_SELECTION_BUNDLE = "selectionBundle";
	var UIMARK_ALL_CELL_LAYER = "allCellLayer";
	
	var _this = this;
	
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;
	
	var _jqUi = $("<div>");

	var _mapSelectionMarkBundles = {};

	var init = function()
	{
		_jqUi.css("position", "absolute"); 
		
		_jqUi.mouseup(onMouseOperate);
		_jqUi.mousedown(onMouseOperate);
		_jqUi.mousemove(onMouseOperate);
		_jqUi.dblclick(onMouseOperate);
		
		_oTable.getSelectionModel().addChangeListener(selectionChangeHandler);
	}
	
	/** 不同视图的标识 */
	this.getName = function()
	{
		throw new Error("Override me.");
	}
	
	/** 销毁 */
	this.destroy = function()
	{
		//暂无
	}	
	
	/** 取得jQuery封装对象 */
	this.getUI = function()
	{
		return _jqUi;
	}
	
	this.getCellsContainer = function()
	{
		return _jqUi.find("div[" + UIMARK + "='" + UIMARK_ALL_CELL_LAYER + "']");
	}
	
	/** 创建或重新生成UI */
	this.updateUI = function()
	{
		this.protectedBeforeUpdateUI();
		_jqUi.children().remove();
		createCellsContainer();
		this.repaint();
		this.protectedAfterUpdateUI();
	}
	
	/** UpdateUI()前的初始化，子类可覆盖实现。 */
	this.protectedBeforeUpdateUI = function()
	{
		//Can override.
	}
	
	/** UpdateUI()后，子类可覆盖实现。 */
	this.protectedAfterUpdateUI = function()
	{
		//Can override.
	}
	
	/** 调整内容底部占位对象的位置 */
	this.adjustFootPlaceholder = function()
	{
		//Can override.
	}
	
	/** 调整内容最右边占位对象的位置 */
	this.adjustRightPlaceholder = function()
	{
		//Can override.
	}
	
	/**
	 * 重绘的前置工作，确定重绘的行序号范围等。子类须覆盖实现。 
	 */
	this.protectedBeforeRepaint = function()
	{
		throw new Error("Override me.");
	}
	
	/** 重绘遍历行过程，判断是否创建行，子类可覆盖实现。 */
	this.protectedIsCreateRow = function(iRowIdx, iRowIdxStart, funCreateCellId)
	{
		return true;//该方法中不需要关注行隐藏的情况
	}
	
	/** 重绘的后置工作，子类可覆盖实现。 */
	this.protectedAfterRepaint = function(iRowIdxStart, iRowIdxEnd, funCreateCellId)
	{
		//Can override.
	}
	
	/** 绘制区段的坐标范围[iUpLimit, iDownLimit, iLeftLimit, iRightLimit]，即上下左右边界 */
	this.protectedGetPaintRect = function()
	{
		throw new Error("Override me.");
	}
	
	this.repaint = function()
	{
		repaintTable();
		repaintEmbedObject();
	}
	
	var createCellsContainer = function()
	{
		if(_this.getCellsContainer().length == 0)
		{
			var jqCellsContainer = $("<div>");
			jqCellsContainer.attr(UIMARK, UIMARK_ALL_CELL_LAYER);
			jqCellsContainer.css("z-index", LAYER_ALLCELL);
			jqCellsContainer.css("overflow", "visible");
			_jqUi.append(jqCellsContainer);
		}
	}
	
	var removeAllCell = function()
	{
//		var sCellIdPrefix = createCellId(null, null);
//		_jqUi.find("*[id*='" + sCellIdPrefix + "']").remove();
		_this.getCellsContainer().remove();
		createCellsContainer();
	}
	
	var removeProxyFirstCell = function()
	{
		_this.getUI().find("*[isProxyFirstCell='true']").remove();
	}
	
	var removeCellBeforeRepaint = function()
	{
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			removeProxyFirstCell();
		}
		else
		{
			removeAllCell();
		}
	}
	
	//绘制表格
	var repaintTable = function()
	{
		removeCellBeforeRepaint();
		var arrPreparedInfo = _this.protectedBeforeRepaint();
		var iRowIdxStart = arrPreparedInfo[0];
		var iRowIdxEnd = arrPreparedInfo[1];
		var iColIdxStart = arrPreparedInfo[2];
		var iColIdxEnd = arrPreparedInfo[3];
		var iRowIdxRealPaintStart = iRowIdxStart;
		
		var arrPureSize = [];//避免循环中多次创建对象
		
		var bJumpStartHideRow = true;
		var htmlDocumentFragment = document.createDocumentFragment();
		for(var i = iRowIdxStart; i <= iRowIdxEnd; i++)
		{
			var oRow = _oTable.getRow(i);
			if(bJumpStartHideRow)//找到第一个不隐藏的行,记实际绘制起始行号
			{
				if(oRow.isHide())
				{
					iRowIdxRealPaintStart++;
				}
				else
				{
					bJumpStartHideRow = false;
				}
			}
			if(oRow.isHide() || !_this.protectedIsCreateRow(i, iRowIdxRealPaintStart, createCellId))
			{
				continue;
			}
			var iY = _oUiDependence.getRowY(i);
			for(var j = iColIdxStart; j <= iColIdxEnd; j++)
			{
				var oCol = _oTable.getColumn(j);
				if(oCol.isHide())
				{
					continue;
				}
				var oCell = oRow.getCellForDraw(j);
				var iX = _oUiDependence.getColX(j);
				var htmlDiv = createCellUI(i, j, oRow, oCol, oCell, iX, iY, iRowIdxRealPaintStart, arrPureSize);
				if(htmlDiv)
				{
					htmlDocumentFragment.appendChild(htmlDiv);
				}
			}
		}
		_this.getCellsContainer()[0].appendChild(htmlDocumentFragment);
		_this.protectedAfterRepaint(iRowIdxStart, iRowIdxEnd, createCellId);
	}
	
	//绘制嵌入对象
	var repaintEmbedObject = function()
	{
		var arrEmbedObjects = _oTable.getEmbedObjects();
		var arrPaintRange = _this.protectedGetPaintRect();
		var iUpLimit = arrPaintRange[0];
		var iDownLimit = arrPaintRange[1];
		var iLeftLimit = arrPaintRange[2];
		var iRightLimit = arrPaintRange[3];
		for(var i = 0; i < arrEmbedObjects.length; i++)
		{
			var oEmbedObject = arrEmbedObjects[i];
			if(oEmbedObject.getY() + oEmbedObject.getHeight() < iUpLimit
				|| oEmbedObject.getY() > iDownLimit
				|| oEmbedObject.getX() + oEmbedObject.getWidth() < iLeftLimit
				|| oEmbedObject.getX() > iRightLimit)
			{
				continue;
			}
			var sEmbedObjectUiId = createEmbedObjectId(oEmbedObject);
			if(_jqUi.find("#" + sEmbedObjectUiId).length == 0)//没有画过
			{
				var htmlDiv = createAbsoluteHtmlElement("div",
					oEmbedObject.getX(), oEmbedObject.getY(), 
					oEmbedObject.getWidth(), oEmbedObject.getHeight()); 
				htmlDiv.id = sEmbedObjectUiId;
				htmlDiv.style.zIndex = LAYER_EMBED_OBJECT;
				var jqDiv = $(htmlDiv);
				jqDiv.appendTo(_jqUi);
				var oRender = _oTable.getEmbedObjectRender();
				oRender.paintEmbedObject(oEmbedObject, jqDiv);
			}
		}
	}
	
	var repaintEmbedObjectContent = function(oEmbedObject)
	{
		var sEmbedObjectUiId = createEmbedObjectId(oEmbedObject);
		var jqExistEmbedObjectUi = _jqUi.find("#" + sEmbedObjectUiId);
		if(jqExistEmbedObjectUi.length > 0)
		{
			var oRender = _oTable.getEmbedObjectRender();
			oRender.paintEmbedObject(oEmbedObject, jqExistEmbedObjectUi);
		}
	}
	
	//创建单元格的UI--返回W3C-DOM的对象
	//注意oCell对象有可能为空！
	var createCellUI = function(iRowIdx, iColIdx, oRow, oCol, oCell, iX, iY, iPaintFromRowIdx, arrPureSize)
	{
		var iCellWidth;
		var iCellHeight;
		var oMergeBlock = srarchMergeBlock(iRowIdx, iColIdx, iPaintFromRowIdx);
		var oCurrentRow = oRow;//代理主格可能把oRow重新定位
		var bProxyFirstCell;
		if(oMergeBlock === false)//不是融合块
		{
			iCellWidth = _oUiDependence.getColX(iColIdx + 1) - _oUiDependence.getColX(iColIdx);//oCol.getWidth();
			iCellHeight = _oUiDependence.getRowY(iRowIdx + 1) - _oUiDependence.getRowY(iRowIdx);//oRow.getHeight();
		}
		else if(oMergeBlock)//融合块主格
		{
			if(oMergeBlock instanceof Array)
			{
				bProxyFirstCell = oMergeBlock[1];
				oMergeBlock = oMergeBlock[0];
			}
			if(oMergeBlock.getRowIdxFrom() != iRowIdx || oMergeBlock.getColIdxFrom() != iColIdx)
			{
				//代理主格
				iRowIdx = oMergeBlock.getRowIdxFrom();
				oRow = _oTable.getRow(iRowIdx);
				iColIdx = oMergeBlock.getColIdxFrom();
				oCol = _oTable.getColumn(iColIdx);
				oCell = oRow.getCellForDraw(iColIdx);
				iY = _oUiDependence.getRowY(iRowIdx);
				iX = _oUiDependence.getColX(iColIdx);
			}
			iCellWidth = _oUiDependence.getColX(oMergeBlock.getColIdxTo() + 1) 
				- _oUiDependence.getColX(oMergeBlock.getColIdxFrom());
			var frontier = _oTable.getRowsCount();
			frontier = oMergeBlock.getRowIdxTo() + 1 > frontier ? frontier : oMergeBlock.getRowIdxTo() + 1;
			iCellHeight = _oUiDependence.getRowY(frontier)
				- _oUiDependence.getRowY(oMergeBlock.getRowIdxFrom());
		}
		else//融合块非主格
		{
			return null;
		}
		
		//表格属性设置的行高列宽，是包含边框线（宽度一半）和内边距（padding）和文字区域；
		//CSS承认的width/height属性，只是文字区域，所以要经过以下换算。
		calculatePureSize(iCellWidth, iCellHeight, oCell, oCol, oRow, arrPureSize);
		var iOffsetX = arrPureSize[0];
		var iOffsetY = arrPureSize[1];
		var iCssWidth = arrPureSize[2];
		var iCssHeight = arrPureSize[3];
		
		var sId = createCellId(oCurrentRow, oCol);
		iX += iOffsetX;
		iY += iOffsetY;
		
		var htmlDiv = createAbsoluteHtmlElement("div", iX, iY, iCssWidth, iCssHeight);
		htmlDiv.id = sId;
		htmlDiv.style.zIndex = (oCell && oCell.getValue() ? LAYER_CELL : LAYER_CELL_EMPTY);
		
		var sClassName = _oUiDependence.buildStyle(oRow, oCol, oCell);
		sClassName += _oUiDependence.buildBorder(oRow, oCol, oCell);
		//sClassName = $.trim(sClassName);
		htmlDiv.className = sClassName;

		if(bProxyFirstCell)//融合块代理主格
		{
			$(htmlDiv).attr("isProxyFirstCell", "true");
		}

		var htmlTextArea;
		var iTextW = iCssWidth;
		var iTextH = iCssHeight;
		if(oCell && oCell.getTreeModel())
		{
			var oTreeRender = _oTable.getTreeHandlerRender();
			oTreeRender.setUiDependence(_oUiDependence);
			var arrTree = oTreeRender.create(oCell.getTreeModel(), iRowIdx, iColIdx, iCssWidth, iCssHeight);
			var htmlHandler = arrTree[0];
			if(htmlHandler)
			{
				htmlHandler[UIMARK] = UIMARK_TREE_HANDLER;
				htmlHandler.style.zIndex = 2;
				htmlDiv.appendChild(htmlHandler);
			}
			htmlTextArea = arrTree[1];
			htmlTextArea[UIMARK] = UIMARK_TEXT_SPAN;
			htmlTextArea.style.zIndex = 1;
			htmlDiv.appendChild(htmlTextArea);
			iTextW = parseInt(htmlTextArea.style.width);
			iTextH = parseInt(htmlTextArea.style.height);
		}
		
		if(oCell && oCell.getValue() instanceof KTDiagonalModel)//斜线表头
		{
			var htmlCanvas = new KTDiagonalRender().createCanvas(
				_oTable, oCell.getValue(), iRowIdx, iColIdx, iCellWidth, iCellHeight);
			if(htmlCanvas)
			{
				htmlDiv.appendChild(htmlCanvas);
				htmlCanvas.style.position = "absolute";
				htmlCanvas.style.left = iOffsetX + "px";//iOffsetX,绝对值是左边框一半
				htmlCanvas.style.top = iOffsetY + "px";
			}
		}
		else
		{
			var oRender = _oTable.getCellRender();
			oRender.setContext(oRow, oCol, oCell, iRowIdx, iColIdx, 
					iCssWidth, iCssHeight, iTextW, iTextH, 
					(oMergeBlock instanceof KTMergeBlock) ? oMergeBlock : null);
			oRender.paintCellUI(htmlDiv, htmlTextArea);
		}
		return htmlDiv;
	}
	
	//e.g. sType="div"
	var createAbsoluteHtmlElement = function(sType, iX, iY, iWidth, iHeight)
	{
		var htmlDiv = document.createElement(sType);
		htmlDiv.style.overflow = "hidden";
		htmlDiv.style.position = "absolute";
		htmlDiv.style.left = iX + 'px';
		htmlDiv.style.top = iY + 'px';
		htmlDiv.style.width = iWidth + 'px';
		htmlDiv.style.height = iHeight + 'px';
		return htmlDiv;
	}
	
	var srarchMergeBlock = function(iRowIdx, iColIdx, iPaintFromRowIdx)
	{
		var arrMergeBlocks = _oTable.getMergeBlocks();
		for(var i = 0; i < arrMergeBlocks.length; i++)
		{
			var oMergeBlock = arrMergeBlocks[i];
			//Contains
			if(iRowIdx >= oMergeBlock.getRowIdxFrom() 
				&& iRowIdx <= oMergeBlock.getRowIdxTo()
				&& iColIdx >= oMergeBlock.getColIdxFrom()
				&& iColIdx <= oMergeBlock.getColIdxTo())
			{
				//FirstCell(主格)
				if(iRowIdx == oMergeBlock.getRowIdxFrom() && iColIdx == oMergeBlock.getColIdxFrom())
				{
					return oMergeBlock;
				}
				//代理主格（融合块开始于绘制区域之前）
				if(iRowIdx == iPaintFromRowIdx 
					&& oMergeBlock.getRowIdxFrom() < iPaintFromRowIdx 
					&& iColIdx == oMergeBlock.getColIdxFrom())
				{
					return [oMergeBlock, true];
				}
				//从主格所在行列开始至当前行列之前全隐藏--逻辑等同代理主格,但UI不标识为isProxyFirstCell
				var iFirstNotHideRowIdx = oMergeBlock.getRowIdxFrom() - 1;
				var oRow = null;
				while(iFirstNotHideRowIdx < iRowIdx && (oRow == null || oRow.isHide()))
				{
					oRow = _oTable.getRow(++iFirstNotHideRowIdx);
				}
				if(iFirstNotHideRowIdx == iRowIdx)
				{
					var iFirstNotHideColIdx = oMergeBlock.getColIdxFrom() - 1;
					var oCol = null;
					while(iFirstNotHideColIdx < iColIdx && (oCol == null || oCol.isHide()))
					{
						oCol = _oTable.getColumn(++iFirstNotHideColIdx);
					}
					if(iFirstNotHideColIdx == iColIdx)
					{
						return [oMergeBlock, false];
					}
				}
				//非主格
				return null;
			}
		}
		return false;
	}
	
	var updateStyle = function(oRow, oCol, oCell, jqCell)
	{
		jqCell.removeClass(
			function()
			{
				return makeCssNamesToRemove($(this), KTStyle.CSS_ID_PREFIXE);
			});
		jqCell.addClass(_oUiDependence.buildStyle(oRow, oCol, oCell));
	}
	
	var updateBorder = function(oRow, oCol, oCell, jqCell)
	{
		jqCell.removeClass(
			function()
			{
				return makeCssNamesToRemove($(this), KTBorderStyle.CSS_ID_PREFIXE);
			});
		jqCell.addClass(_oUiDependence.buildBorder(oRow, oCol, oCell, jqCell));
	}
	
	//从class属性中提取以strIdPrefix开头的名称，重新以空格间隔拼成字符串
	var makeCssNamesToRemove = function(jq, strIdPrefix)
	{
		var strClass = jq.attr("class");
		if(strClass)
		{
			var arrClasses = strClass.split(" ");
			strClass = "";
			for(var i = 0; i < arrClasses.length; i++)
			{
				if(arrClasses[i].indexOf(strIdPrefix) == 0)
				{
					if(strClass.length > 0)
					{
						strClass += " ";
					}
					strClass += arrClasses[i];
				}
			}
		}
		return strClass;
	}
	
	//在arrResult中写入计算结果[iOffsetX, iOffsetY, iCssWidth, iCssHeight]
	var calculatePureSize = function(iColsWidth, iRowsHeight, oCell, oCol, oRow, arrResult)
	{
		var iRightBorderWidth = _oTable.getStyleValue(oCell, oCol, oRow, "getBorder", "getRightBorderWidth", 0);
		var iLeftBorderWidth = _oTable.getStyleValue(oCell, oCol, oRow, "getBorder", "getLeftBorderWidth", 0);
		var iTopBorderWidth = _oTable.getStyleValue(oCell, oCol, oRow, "getBorder", "getTopBorderWidth", 0);
		var iBottomBorderWidth = _oTable.getStyleValue(oCell, oCol, oRow, "getBorder", "getBottomBorderWidth", 0);
		//var iPadding = 0;//padding * 2
		
		var iHalfRight = iRightBorderWidth >> 1;//Math.floor(iRightBorderWidth / 2)
		var iHalfLeft = iLeftBorderWidth >> 1;
		var iCssWidth = iColsWidth - (iLeftBorderWidth - iHalfLeft) - iHalfRight;// - iPadding;
		iCssWidth = (iCssWidth < 0 ? 0 : iCssWidth);
		
		var iHalfTop = iTopBorderWidth >> 1;
		var iHalfBottom = iBottomBorderWidth >> 1;
		var iCssHeight = iRowsHeight - (iTopBorderWidth - iHalfTop) - iHalfBottom;// - iPadding;
		iCssHeight = (iCssHeight < 0 ? 0 : iCssHeight);
		
		//避免频繁创建对象，在传入的数组中写入结果
		arrResult[0] = -iHalfLeft;
		arrResult[1] = -iHalfTop;
		arrResult[2] = iCssWidth;
		arrResult[3] = iCssHeight;
	}
	
	//创建嵌入对象的ID
	var createEmbedObjectId = function(oEmbedObject)
	{
		return _oTable.getId() + _this.getName() + "_Embed_" + oEmbedObject.getId();
	}
	
	//创建单元格的ID，此ID用在HTML元素(div)上，从而从模型可定位到UI。
	var createCellId = function(oRow, oCol)
	{
		var sId = "cell_I_";
		if(oRow)
		{
			sId += oRow.getKey() + "_I_";
			if(oCol)
			{
				sId += oCol.getKey();
			}
		}
		return sId;
	}
	
	//从UI上的单元格id，查找出对应的模型--Cell的Path对象
	var searchCellModelById = function(strCellId)
	{
		if(!strCellId || strCellId.indexOf("cell_I_") != 0)
		{
			return null;
		}
		var arrSeg = strCellId.split("_I_");
		if(arrSeg.length != 3)
		{
			return null;
		}
		var strRowKey = arrSeg[1];
		var strColKey = arrSeg[2];
		var oRow;
		var iRowIdx = -1;
		for(var i = 0, ic = _oTable.getRowsCount(); i < ic; i++)
		{
			oRow = _oTable.getRow(i);
			if(oRow.getKey() == strRowKey)
			{
				iRowIdx = i;
				break;
			}
		}
		if(iRowIdx == -1)
		{
			return null;
		}
		var oCol = _oTable.getColumn(strColKey);
		var iColIdx = _oTable.getColumnIndex(oCol);
		var oCell = oRow.getCellForDraw(iColIdx);
		var oPath = new KTCell.Path(oRow, iColIdx, oCell);
		oPath.$innerSetInfo(iRowIdx, oCol);
		return oPath;
	}
	
	/**
	 * 模型属性变化，通知UI更新
	 * @param oModel: 发生属性变化的模型对象或信息封装
	 * @param strPropertyName: 属性名称
	 * @param value: 新值
	 * @param oldValue: 变化前的旧值
	 */
	this.propertyChangeHandler = function(oModel, strPropertyName, value, oldValue)
	{
		switch(strPropertyName)
		{
			case KTColumn.WIDTH:
				//updateColWidth(oModel);
				//this.updateUI();//by hassan
				return true;
			case KTRow.HEIGHT:
				//updateRowHeight(oModel);
				//this.updateUI();//by hassan
				return true;
			case KTCell.VALUE:
				updateCellValue(oModel);
				break;
			case KTStyle.STYLE_COMMON:
			case KTStyle.STYLE_TEXT_SPECIAL:
			case KTBorderStyle.BORDER_COMMON:
			case KTBorderStyle.BORDER_WIDTH:
				//通用样式和边框样式相同处理
				if(oModel instanceof KTable)
				{
					return true;
				}
				updateCss(oModel, strPropertyName);
				break;
			case KTRow.HIDE:
				this.protectedUpdateByRowHide();
				break;
			case KTColumn.HIDE:
				this.protectedUpdateByColumnHide();
				break;
			case KTEmbedObject.DATA:
				repaintEmbedObjectContent(oModel);
				break;
			default:
		}
		return false;
	}
	
	/**
	 * 模型结构变化，通知UI更新
	 */
	this.modelChangeHandler = function(oModel, strType)
	{
		switch(strType)
		{
			case KTableUI.INSERT_COL:
			case KTableUI.REMOVE_COL:
				//updateColWidth(oModel, strType);
				//this.updateUI();//by hassan
				return true;
			case KTableUI.INSERT_ROW:
			case KTableUI.REMOVE_ROW:
				//updateRowHeight(oModel, strType);
				//this.updateUI();//by hassan
				return true;
			case KTableUI.ADD_MERGEBLOCK:
			case KTableUI.REMOVE_MERGEBLOCK:
				//this.updateUI();
				return true;
		}
		return false;
	}
	
	this.protectedUpdateByRowHide = function()
	{
		repaintTable();
		_this.adjustFootPlaceholder();
	}
	
	this.protectedUpdateByColumnHide = function()
	{
		repaintTable();
		_this.adjustRightPlaceholder();
	}
	
	//更新指定模型所包含的单元格的指定样式
	var updateCss = function(oModel, strPropertyName)
	{
		if(oModel instanceof KTCell.Path)
		{
			var iX = (strPropertyName == KTBorderStyle.BORDER_WIDTH ? _oUiDependence.getColX(oModel.getColIndex()) : 0);
			var iY = (strPropertyName == KTBorderStyle.BORDER_WIDTH ? _oUiDependence.getRowY(oModel.getRowIndex()) : 0);
			updateCellCss(oModel.getRow(), oModel.getCol(), oModel.getCell(), strPropertyName, iX, iY);
			updateCellValue(oModel);
		}
		else if(oModel instanceof KTRow)
		{
			var iRowIdx = _oTable.getRowIndex(oModel);
			var iY = (strPropertyName == KTBorderStyle.BORDER_WIDTH ? 
				_oUiDependence.getRowY(_oTable.getRowIndex(oModel)) : 0);
			for(var j = 0, jc = _oTable.getColumnsCount(); j < jc; j++)
			{
				var oCol = _oTable.getColumn(j);
				var oCell = oModel.getCellForDraw(j);
				var iX = _oUiDependence.getColX(i);
				updateCellCss(oModel, oCol, oCell, strPropertyName, iX, iY);
				
				var oPath = new KTCell.Path(oModel, j, oCell);
				oPath.$innerSetInfo(iRowIdx, oCol);
				updateCellValue(oPath);
			}
		}
		else if(oModel instanceof KTColumn)
		{
			//TODO 此处BUG:不在绘制区域,但在缓存中的UI没更新...
			//遍历所有行也不合理; 不同视图,不一定更新,也有可能做无用功(以上行也是).
			var iX = (strPropertyName == KTBorderStyle.BORDER_WIDTH ? 
				_oUiDependence.getColX(_oTable.getColumnIndex(oModel)) : 0);
			var iColIdx = _oTable.getColumnIndex(oModel);
			for(var i = 0, ic = _oTable.getRowsCount(); i < ic; i++)
			{
				var oRow = _oTable.getRow(i);
				var oCell = oRow.getCellForDraw(iColIdx);
				var iY = _oUiDependence.getRowY(i);
				updateCellCss(oRow, oModel, oCell, strPropertyName, iX, iY);
				
				var oPath = new KTCell.Path(oRow, iColIdx, oCell);
				oPath.$innerSetInfo(i, oModel);
				updateCellValue(oPath);
			}
		}
	}
	
	//更新一个单元格的样式
	var updateCellCss = function(oRow, oCol, oCell, strPropertyName, iX, iY)
	{
		var strId = createCellId(oRow, oCol);
		var jqCell = _jqUi.find("#" + strId);
		if(jqCell.length == 0)
		{
			return;
		}
		if(strPropertyName == KTStyle.STYLE_COMMON || strPropertyName == KTStyle.STYLE_TEXT_SPECIAL)
		{
			updateStyle(oRow, oCol, oCell, jqCell);
		}
		else if(strPropertyName == KTBorderStyle.BORDER_COMMON)
		{
			updateBorder(oRow, oCol, oCell, jqCell);
		}
		else if(strPropertyName == KTBorderStyle.BORDER_WIDTH)
		{
			updateBorder(oRow, oCol, oCell, jqCell);
			//单元格(div)的width、height属性是纯高宽，会受边框线宽影响
			var arrPureSize = [];
			var iRowIdx = _oTable.getRowIndex(oRow);
			var iHeight = _oUiDependence.getRowY(iRowIdx + 1) - _oUiDependence.getRowY(iRowIdx);
			var iColIdx = _oTable.getColumnIndex(oCol);
			var iWidth = _oUiDependence.getColX(iColIdx + 1) - _oUiDependence.getColX(iColIdx);
			calculatePureSize(iWidth, iHeight, oCell, oCol, oRow, arrPureSize);
			jqCell.css("left", iX + arrPureSize[0]);
			jqCell.css("top", iY + arrPureSize[1]);
			jqCell.width(arrPureSize[2]);
			jqCell.height(arrPureSize[3]);
		}
	}
	
//	//更新UI的列宽
//	var updateColWidth = function(oAdjustColumn, strSyncUIMark)
//	{
//		var iAddX = 0;
//		var bBeforeAdjust = true;//目标列之前
//		for(var j = 0, jc = _oTable.getColumnsCount(); j < jc; j++)
//		{
//			var oCol = _oTable.getColumn(j);
//			var iWidth = oCol.getWidth();
//			var bAdjust = false;//是否位于调整的目标列
//			if(bBeforeAdjust)
//			{
//				if(oCol == oAdjustColumn)
//				{
//					bAdjust = true;
//					bBeforeAdjust = false;
//				}
//				else
//				{
//					iAddX += iWidth;
//					continue;
//				}
//			}
//			if(bAdjust && strSyncUIMark == KTableUI.REMOVE_COL)
//			{
//				var strColKey = oCol.getKey()
//				var jqCells = _jqUi.find("*[id*='" + strColKey + "']");
//				jqCells.remove();
//				continue;//不累加宽度
//			}
//			var iAddY = 0;
//			for(var i = 0, ic = _oTable.getRowsCount(); i < ic; i++)
//			{
//				var oRow = _oTable.getRow(i);
//				if(bAdjust && strSyncUIMark == KTableUI.INSERT_COL)
//				{
//					var jqCell = createCellUI(i, j, oRow, oCol, oRow.getCellForDraw(j), iAddX, iAddY);
//					jqCell.appendTo(_jqUi);
//					iAddY += oRow.getHeight();
//				}
//				else
//				{
//					var oCell = oRow.getCellForDraw(j);
//					var oCellBorder = (oCell ? oCell.getBorder() : null);
//					var arrBorder = [oCellBorder, oCol.getBorder(), oRow.getBorder(), _oTable.getBorder()];
//					var arrPW = calculatePureWidth(oCol.getWidth(), arrBorder);
//					var iOffsetX = arrPW[1];
//					var strId = createCellId(oRow, oCol);
//					var jqCell = _jqUi.find("#" + strId);
//					jqCell.css("left", iAddX + iOffsetX);
//					if(bAdjust)
//					{
//						var iCssWidth = arrPW[0];
//						jqCell.width(iCssWidth);
//					}
//				}
//				oTable.updateMergeBlock(null, j);
//			}
//			iAddX += iWidth;
//		}
//	}
//	
//	//更新UI的行高
//	var updateRowHeight = function(oAdjustRow, strSyncUIMark)
//	{
//		var iAddY = 0;
//		var bBeforeAdjust = true;//目标行之前
//		for(var i = 0, ic = _oTable.getRowsCount(); i < ic; i++)
//		{
//			var oRow = _oTable.getRow(i);
//			var iHeight = oRow.getHeight();
//			var bAdjust = false;//在目标行上
//			if(bBeforeAdjust)
//			{
//				if(oRow == oAdjustRow)
//				{
//					bAdjust = true;
//					bBeforeAdjust = false;
//				}
//				else
//				{
//					iAddY += iHeight;
//					continue;
//				}
//			}
//			if(bAdjust && strSyncUIMark == KTableUI.REMOVE_ROW)
//			{
//				var strRowKey = oRow.getKey()
//				var jqCells = _jqUi.find("*[id*='" + strRowKey + "']");
//				jqCells.remove();
//				continue;//不累加高度
//			}
//			var iAddX = 0;
//			for(var j = 0, jc = _oTable.getColumnsCount(); j < jc; j++)
//			{
//				var oCol = _oTable.getColumn(j);
//				if(bAdjust && strSyncUIMark == KTableUI.INSERT_ROW)
//				{
//					var jqCell = createCellUI(i, j, oRow, oCol, oRow.getCellForDraw(j), iAddX, iAddY);
//					jqCell.appendTo(_jqUi);
//					iAddX += oCol.getWidth();
//				}
//				else
//				{
//					var oCell = oRow.getCellForDraw(j);
//					var oCellBorder = (oCell ? oCell.getBorder() : null);
//					var arrBorder = [oCellBorder, oCol.getBorder(), oRow.getBorder(), _oTable.getBorder()];
//					var arrPH = calculatePureHeight(oRow.getHeight(), arrBorder);
//					var iOffsetY = arrPH[1];
//					var strId = createCellId(oRow, oCol);
//					var jqCell = _jqUi.find("#" + strId);
//					jqCell.css("top", iAddY + iOffsetY);
//					if(bAdjust)
//					{
//						var iCssHeight = arrPH[0];
//						jqCell.height(iCssHeight);
//					}
//				}
//				oTable.updateMergeBlock(i, null);
//			}
//			iAddY += iHeight;
//		}
//	}
	
	//更新UI的单元格内容
	var updateCellValue = function(oPath)
	{
		var strId = createCellId(oPath.getRow(), oPath.getCol());
		var jqCell = _jqUi.find("#" + strId);
		if(jqCell.length == 0)
		{
			return;
		}
		var htmlTextArea = null;
		var iTextW = jqCell.width();
		var iTextH = jqCell.height();
		var jqSpans = jqCell.find("span");
		for(var i = 0; i < jqSpans.length; i++)
		{
			if(jqSpans[i][UIMARK] == UIMARK_TEXT_SPAN)
			{
				htmlTextArea = jqSpans[i];
				var jqTextArea = $(htmlTextArea);
				iTextW = jqTextArea.width();
				iTextH = jqTextArea.height();
				break;
			}
		}
		var oRender = _oTable.getCellRender();
		oRender.setContext(
			oPath.getRow(), 
			oPath.getCol(), 
			oPath.getCell(), 
			oPath.getRowIndex(), 
			oPath.getColIndex(), 
			jqCell.width(), 
			jqCell.height(), 
			iTextW, 
			iTextH);
		oRender.paintCellUI(jqCell[0], htmlTextArea);		
	}
	
	
	//记录鼠标按下位置，弹起时位于相同位置则为click
	var _arrLastMouseDownPosition = [-0xffff, -0xffff];
	//处理DOM对象的原始鼠标事件
	var onMouseOperate = function(evt)
	{
		var sEventType = evt.type;
		if(sEventType == "click")
		{
			return;//click判断按键不靠谱，用mousedown+up模拟
		}
		else if(sEventType == "mousemove")
		{
			if(!_oTable.getSelectionModel().isPolicySetting(KTSelectionModel.POLICY_BLOCK))
			{
				return;//有块选时才发move事件
			}
		}
		else if(sEventType == "mouseup")
		{
			//允许点下之后有个短距离的拖拽再弹起
			if(Math.abs(_arrLastMouseDownPosition[0] - evt.screenX) < 5
				&& Math.abs(_arrLastMouseDownPosition[1] - evt.screenY) < 5)
			{
				fireMouseEvent(evt, "click");
			}
		}
		else if(sEventType == "mousedown")
		{
			_arrLastMouseDownPosition = [evt.screenX, evt.screenY];
		}
		fireMouseEvent(evt, sEventType);
	}
	
	var fireMouseEvent = function(evt, sEventType)
	{
		var htmlView = _jqUi[0];
		//从点击对象向上计算它（很可能是cell）在视图（即表格）中的位置
		var iXCellAtTable = 0;
		var iYCellAtTable = 0;
		var htmlElement = evt.target;
		if(htmlElement == htmlView)//点在滚动条上
		{
			iXCellAtTable = htmlView.scrollLeft;
			iYCellAtTable = htmlView.scrollTop;
		}
		while(htmlElement && htmlElement != htmlView)
		{
			iXCellAtTable += htmlElement.offsetLeft;
			iYCellAtTable += htmlElement.offsetTop ;
			htmlElement = htmlElement.parentNode;
		}
		//将鼠标位置换算成相对于表格的位置
		var iXMouseAtTable = evt.offsetX + iXCellAtTable;//offsetX是鼠标相对于点击对象的
		var iYMouseAtTable = evt.offsetY + iYCellAtTable;
		var iXMouseAtTableWin = iXMouseAtTable - htmlView.scrollLeft;
		var iYMouseAtTableWin = iYMouseAtTable - htmlView.scrollTop;
		
		if(iXMouseAtTableWin >= htmlView.clientWidth || iYMouseAtTableWin >= htmlView.clientHeight)
		{
			return;//点到滚动条上了
		}
		htmlElement = evt.target;
		var oPath;
		var bPointTreeHandler = false;
		//从点击对象向上搜树收展操作标记，至View为止
		while(htmlElement && htmlElement != htmlView)
		{
			if(bPointTreeHandler)//树可能蹿出单元格，用向上找的方式
			{
				oPath = searchCellModelById(htmlElement.id);
				if(oPath)
				{
					break;
				}
			}
			if(!bPointTreeHandler && htmlElement[UIMARK] == UIMARK_TREE_HANDLER)
			{
				bPointTreeHandler = true;
			}
			htmlElement = htmlElement.parentNode;
		}
		if(!oPath)
		{
			//通过位置算单元格
			oPath = searchCellModelByPoint(iXMouseAtTable, iYMouseAtTable);
		}
		//封装事件，外发
		var oEventWrap = new InnerMouseEventWrap(evt, iXMouseAtTableWin, iYMouseAtTableWin, oPath, bPointTreeHandler);
		_oUiDependence.fireEvent(sEventType, oEventWrap);
	}
	
	//从UI上的坐标，查找出对应的模型--Cell的Path对象
	var searchCellModelByPoint = function(iX, iY)
	{
		var arrIdx = _oUiDependence.searchCell(iX, iY);
		if(arrIdx == null)
		{
			return null;
		}
		var iRowIdx = arrIdx[0]
		var iColIdx = arrIdx[1];
		var oRow = _oTable.getRow(iRowIdx);
		var oCol = _oTable.getColumn(iColIdx);
		var oCell = oRow.getCellForDraw(iColIdx);
		var oPath = new KTCell.Path(oRow, iColIdx, oCell);
		oPath.$innerSetInfo(iRowIdx, oCol);
		return oPath;
	}
	
	//选中模型改变事件监听
	var selectionChangeHandler = function(strType, arrTargets)
	{
		if(_oTable.getSelectionRender() === null)
		{
			return;//可以通过setSelectionRender(null)（显式指定null）来屏蔽内置实现
		}
		for(var i = 0; i < arrTargets.length; i++)
		{
			var oTarget = arrTargets[i];
			if(strType == KTSelectionModel.CHANGE_ADD)
			{
				var arrRange = _oTable.getSelectionModel().parseBlockRange(oTarget);
				var arrXY = idxRowCol2XY(arrRange[0], arrRange[1], arrRange[2], arrRange[3]);
				var oSelectionMarkBundle = createSelectionRender();
				_mapSelectionMarkBundles[oTarget] = oSelectionMarkBundle;
				oSelectionMarkBundle.letOthersOld(_jqUi);
				oSelectionMarkBundle.show(_jqUi, arrXY[0], arrXY[1], arrXY[2], arrXY[3]);
			}
			else if(strType == KTSelectionModel.CHANGE_REMOVE)
			{
				if(_mapSelectionMarkBundles[oTarget])
				{
					_mapSelectionMarkBundles[oTarget].remove();
					delete _mapSelectionMarkBundles[oTarget];
					
					var oCurrentSelected = _oTable.getSelectionModel().getSelected();
					var oCurrentMarkBundle = _mapSelectionMarkBundles[oCurrentSelected];
					if(oCurrentMarkBundle)
					{
						oCurrentMarkBundle.current();
					}
				}
			}
		}
	}
	
	var idxRowCol2XY = function(iStartRowIdx, iStartColIdx, iEndRowIdx, iEndColIdx)
	{
		var iX1 = _oUiDependence.getColX(iStartColIdx);
		var iY1 = _oUiDependence.getRowY(iStartRowIdx);
		var iX2 = _oUiDependence.getColX(iEndColIdx + 1);
		var iY2 = _oUiDependence.getRowY(iEndRowIdx + 1);
		return [iX1, iY1, iX2, iY2];
	}
	
	var createSelectionRender = function()
	{
		var funRenderClass = _oTable.getSelectionRender();
		funRenderClass = (funRenderClass ? funRenderClass : SelectionMarkBundle);
		var oRender = new funRenderClass();
		oRender.setTable(_oTable);
		return oRender;
	}
	
	var _oLastDragingMarkBundle = null;
	this.showDragingMarkBundle = function(oSelectionTarget)
	{
		if(_oLastDragingMarkBundle)
		{
			_oLastDragingMarkBundle.remove();
			_oLastDragingMarkBundle = null;
		}
		if(oSelectionTarget)
		{
			var oCurrentSelected = _oTable.getSelectionModel().getSelected();
			var oCurrentBundle = _mapSelectionMarkBundles[oCurrentSelected];
			if(oCurrentBundle)
			{
				oCurrentBundle.remove();
			}
			
			var arrRange =  _oTable.getSelectionModel().parseBlockRange(oSelectionTarget);
			var arrXY = idxRowCol2XY(arrRange[0], arrRange[1], arrRange[2], arrRange[3]);
			_oLastDragingMarkBundle = createSelectionRender();
			_oLastDragingMarkBundle.show(_jqUi, arrXY[0], arrXY[1], arrXY[2], arrXY[3]);
		}
		else
		{
			var oCurrentSelected = _oTable.getSelectionModel().getSelected();
			var oCurrentBundle = _mapSelectionMarkBundles[oCurrentSelected];
			if(oCurrentBundle)
			{
				var arrRange = _oTable.getSelectionModel().parseBlockRange(oCurrentSelected);
				var arrXY = idxRowCol2XY(arrRange[0], arrRange[1], arrRange[2], arrRange[3]);
				oCurrentBundle.show(_jqUi, arrXY[0], arrXY[1], arrXY[2], arrXY[3]);
			}
		}
	}
	
	this.getMaxFrozenRowIdx = function()
	{
		return Math.min(_oTable.getFrozenRows() - 1, _oTable.getRowsCount() - 1);
	}
	
	this.getMaxFrozenColumnIdx = function()
	{
		return Math.min(_oTable.getFrozenColumns() - 1, _oTable.getColumnsCount() - 1);
	}
	
	init();
	
	/** 
	 * 封装UI上的鼠标事件，带上操作UI上的元素的数据 
	 */
	function InnerMouseEventWrap(evt, iXMouseAtTable, iYMouseAtTable, oMouseTargetModel, bPointTreeHandler)
	{
		KTAbstractMouseEvent.call(this, evt, iXMouseAtTable, iYMouseAtTable);
		
		var _oMouseTargetModel = oMouseTargetModel;
		var _bPointTreeHandler = bPointTreeHandler;
	
		/** 原始的鼠标事件（jQuery的） */
		this.getOriginalEvent = function()
		{
			return evt;
		}
		
		/** 是否点中单元格 */	
		this.isCellPointed = function()
		{
			//TODO 可扩展为表示悬浮对象、行头、列头等
			return (_oMouseTargetModel instanceof KTCell.Path);
		}
		
		/** 取得选中目标 */
		this.getMouseTargetModel = function()
		{
			return _oMouseTargetModel;
		}
		
		/** 是否点中树收/展操作的加减号 */
		this.isPointTreeHandler = function()
		{
			return _bPointTreeHandler;
		}
	}
	
	/**
	 * 一个Bundle由一些小的DIV围成一个圈，表示一个选中目标
	 */
	function SelectionMarkBundle()
	{
		KTableSelectionRender.call(this);
		
		var _jqDivTop = $('<div>');
		var _jqDivRight = $('<div>');
		var _jqDivBottom = $('<div>');
		var _jqDivLeft = $('<div>');
		
		var strSearchExpr = "div[" + UIMARK + "='" + UIMARK_SELECTION_BUNDLE + "']";
		
		this.show = function(jqOwner, iX1, iY1, iX2, iY2)
		{
			iX1 = iX1 - 1;
			iY1 = iY1 - 1;
			iX2 = iX2 - 1;
			iY2 = iY2 - 1;
			var iWidth = iX2 - iX1;
			var iHeight = iY2 - iY1;
			
			initElement(_jqDivTop, iX1, iY1, iWidth, 0);
			initElement(_jqDivBottom, iX1, iY2, iWidth, 0);
			initElement(_jqDivLeft, iX1, iY1, 0, iHeight);
			initElement(_jqDivRight, iX2, iY1, 0, iHeight);

			jqOwner.append(_jqDivTop);
			jqOwner.append(_jqDivRight);
			jqOwner.append(_jqDivBottom);
			jqOwner.append(_jqDivLeft);
		}
		
		this.remove = function()
		{
			_jqDivTop.remove();
			_jqDivRight.remove();
			_jqDivBottom.remove();
			_jqDivLeft.remove();
		}
		
		this.current = function()
		{
			letMeNew(_jqDivTop);
			letMeNew(_jqDivBottom);
			letMeNew(_jqDivLeft);
			letMeNew(_jqDivRight);
		}
		
		var initElement = function(jqDiv, x, y, w, h)
		{
			jqDiv.attr(UIMARK, UIMARK_SELECTION_BUNDLE);
			jqDiv.css("z-index", LAYER_SELECTION_MARK);
			jqDiv.css("position", "absolute");
			jqDiv.css("left", x);
			jqDiv.css("top", y);
			jqDiv.width(w);
			jqDiv.height(h);
			jqDiv.css("overflow", "hidden");//for IE6 height 0
			jqDiv.css("border-width", "1px");
			jqDiv.css("border-style", "solid");
			letMeNew(jqDiv);
		}
		
		this.letOthersOld = function(jqOwner)
		{
			jqOwner.find(strSearchExpr).css("border-color", "#ffcc33");
		}
		
		var letMeNew = function(jqDiv)
		{
			jqDiv.css("border-color", "#aa6600");
		}
	}
}

/**
 * 选中目标绘制器
 * 对于多选，每一个选中是一个实例
 */
function KTableSelectionRender()
{
	var _oTable;
	
	this.setTable = function(oTable)
	{
		_oTable = oTable;
	}
	this.getTable = function()
	{
		return _oTable;
	}
	
	/** 在指定容器的指定范围内展现选中标识 */
	this.show = function(jqOwner, iX1, iY1, iX2, iY2){};
	
	/** 移除选中标识 */
	this.remove = function(){};
	
	/** 使该选中标识展现为最新选中的（仅对多选有效） */
	this.current = function(){};
	
	/** 使其它选中标识展现为非最新选中的（仅对多选有效） */
	this.letOthersOld = function(jqOwner){};
}

/**
 * 这是主视图和左冻结视图的超类，支持滚动过程动态重绘
 */
function KTableUIManyRowsView(oTable, oUiDependence)
{
	KTableUIAbstractView.call(this, oTable, oUiDependence);
	
	var _this = this;
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;

	var _arrRowCreated;//标识行的UI已创建，并作为已创建但要移出DOM树的对象的缓存。
	var _arrLastTimeRepaintRange;
	
	var _iScrollRepaintDelta;
	var _iScrollCreateUIOffset;
	
	var _jqFootPlaceholder;//内容末尾总是出现的占位对象，使滚动条比例正确。
	var _jqRightPlaceholder;//也使单元格DIV移掉重绘时滚动条不乱跳。
	
	var initScroll = function()
	{
		_iScrollRepaintDelta = _this.getUI().prop("clientHeight") * 0.5 ;
		_iScrollCreateUIOffset = _this.getUI().prop("clientHeight") * 1;
		//新的滚动位置如果超过_iLastScrollTop ± _iScrollRepaintDelta，则再次重绘。
		//每次重绘创建的行，范围为 可见区域 ± _iScrollCreateUIOffset，称可见及延伸范围。
	}
	
	this.getScrollRepaintDelta = function()
	{
		return _iScrollRepaintDelta;
	}
	
	//Override
	this.protectedBeforeUpdateUI = function()
	{
		_arrRowCreated = [];
		initScroll();
	}
	
	//Override
	this.protectedAfterUpdateUI = function()
	{
		this.adjustFootPlaceholder();
		this.adjustRightPlaceholder();
	}
	
	//Override
	this.adjustFootPlaceholder = function()
	{
		if(!_jqFootPlaceholder)
		{
			_jqFootPlaceholder = $('<div style="position:absolute; left:0px; width:20px; height:1px; overflow:hidden">');
		}
		var iMaxBottom = _oUiDependence.getRowY(_oTable.getRowsCount());
		_jqFootPlaceholder.css("top", iMaxBottom + "px");
		_jqFootPlaceholder.appendTo(_this.getUI());
	}
	
	//Override
	this.adjustRightPlaceholder = function()
	{
		if(!_jqRightPlaceholder)
		{
			_jqRightPlaceholder = $('<div style="position:absolute; top:0px; width:1px; height:20px">');
		}
		var iMaxRight = _oUiDependence.getColX(_oTable.getColumnsCount());
		_jqRightPlaceholder.css("left", iMaxRight + "px");
		_jqRightPlaceholder.appendTo(_this.getUI());
	}
	
	//滚动动态重绘时，可见部分（及其前后延伸部分）的坐标值上下限
	this.createPaintSection = function()
	{
		var iUpLimit, iDownLimit;
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			var iScrollTop = _this.getUI().prop("scrollTop");
			var iClientHeight = _this.getUI().prop("clientHeight");
			iUpLimit = iScrollTop - _iScrollCreateUIOffset;
			iDownLimit = iScrollTop + iClientHeight + _iScrollCreateUIOffset;
		}
		else
		{
			iUpLimit = 0;
			iDownLimit = 0x7fffffff;
		}
		return [iUpLimit, iDownLimit];
	}
	
	//滚动动态重绘的行序号范围
	this.createRowsRange = function()
	{
		var iRowIdxStart, iRowIdxEnd;
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			var arrSection = this.createPaintSection();
			var iUpLimit = arrSection[0];
			var iDownLimit = arrSection[1];
			iRowIdxStart = _oUiDependence.searchRowIdx(iUpLimit);
			iRowIdxEnd = _oUiDependence.searchRowIdx(iDownLimit);
		}
		else
		{
			iRowIdxStart = 0;
			iRowIdxEnd = _oTable.getRowsCount() - 1;
		}
		return [iRowIdxStart, iRowIdxEnd];
	}
	
	//Override
	this.protectedIsCreateRow = function(iRowIdx, iRowIdxStart, funCreateCellId)
	{
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			var cache = _arrRowCreated[iRowIdx];
			if(cache)//行已创建
			{
				if(iRowIdx == iRowIdxStart && isMergeBlockCross(iRowIdx))
				{
					//绘制起始行上有融合块穿过（将会出现代理主格），擦掉重绘
					if(cache === true)
					{
						cache = getCacheRow(iRowIdx, funCreateCellId);
					}					
					cache.remove();
				}
				else
				{
					if(cache !== true)//cache值为true的是已在界面上(即DOM树上)的行
					{
						//曾经绘制过，后来被擦除掉，现在在缓存中的
						_this.getCellsContainer().append(cache);
					}
					return false;
				}
			}
			_arrRowCreated[iRowIdx] = true;//下面将会创建在可见及延伸范围内的行，先记为true。
		}
		return true;
	}
	
	//Override
	this.protectedAfterRepaint = function(iRowIdxStart, iRowIdxEnd, funCreateCellId)
	{
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			setTimeout(
				function()
				{
					//滚动动态重绘时，补上移除的逻辑。
					//超出可见及延伸范围的行，如果已创建的，从DOM树上摘下来，缓存备用。
					var iRemoveFrom = _arrLastTimeRepaintRange ? _arrLastTimeRepaintRange[0] : -1;
					var iRemoveTo = _arrLastTimeRepaintRange ? _arrLastTimeRepaintRange[1] : -2;
					for(var i = iRemoveFrom; i <= iRemoveTo; i++)
					{
						//上一次和这一次可能有重叠，只处理不重叠的。
						if(i < iRowIdxStart || i > iRowIdxEnd)
						{
							var cache = _arrRowCreated[i];
							if(cache)
							{
								if(cache === true)
								{
									cache = getCacheRow(i, funCreateCellId);
									_arrRowCreated[i] = cache;//缓存
								}
								cache.remove();//从DOM树上摘下
								//如果单元格上有事件，应该考虑用.detach()
							}
						}
					}
					_arrLastTimeRepaintRange = [iRowIdxStart, iRowIdxEnd];
				}, 
				10);
		}
	}
	
	var getCacheRow = function(iRowIdx, funCreateCellId)
	{
		var oRow = _oTable.getRow(iRowIdx);
		cache = _this.getUI().find("*[id*='" + funCreateCellId(oRow) + "']");
		return cache;
	}

	var isMergeBlockCross = function(iRowIdx)
	{
		return true;//TODO 暂时不判断融合块穿过也可以，那就是绘制起始行总是擦掉重绘。
	}
	
	//Override
	var superProtectedUpdateByRowHide = this.protectedUpdateByRowHide;
	this.protectedUpdateByRowHide = function()
	{
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			_arrRowCreated = [];
		}
		superProtectedUpdateByRowHide();
	}
	
	//Override
	var superProtectedUpdateByColumnHide = this.protectedUpdateByColumnHide;
	this.protectedUpdateByColumnHide = function()
	{
		if(_oUiDependence.isScrollDynamicRepaint())
		{
			_arrRowCreated = [];
		}
		superProtectedUpdateByColumnHide();
	}
}

/**
 * 主视图
 * 带滚动条，能同步让冻结行列视图滚动
 */
function KTableUIMainView(oTable, oUiDependence)
{
	KTableUIManyRowsView.call(this, oTable, oUiDependence);
	
	var _this = this;
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;
	
	var _iLastScrollTop = 0;//用于区别纵向还是横向的滚动
	
	//以下变量仅在_bScrollDynamicRepaint开启时有效
	var _iLastOnScrollDelayFuncId;//上一次原生滚动事件时设置的延迟判断(setTimeout)的函数ID。
	var _iLastRepaintScrollTop = 0;
	
	
	var init = function()
	{
		_this.getUI().css("overflow", "auto");
		_this.getUI().scroll(onScroll);
	}
	
	var onScroll = function(evt)
	{
		if(!_oUiDependence.isScrollDynamicRepaint())
		{
			_oUiDependence.fireEvent("scroll", new ScrollEventWrap(evt));
			_iLastScrollTop = _this.getUI().prop("scrollTop");
			return;
		}
		//将短时间内连续发生的滚动事件，减少为一次
		var SHORT_TIME = 50;//此值是否需要可设置？
		clearTimeout(_iLastOnScrollDelayFuncId);
		_iLastOnScrollDelayFuncId = setTimeout(
			function()
			{
				innerScrollHandler();
				_oUiDependence.fireEvent("scroll", new ScrollEventWrap(evt));
				_iLastScrollTop = _this.getUI().prop("scrollTop");
			},
			SHORT_TIME);
	}
	
	var innerScrollHandler = function()
	{
		var iScrollTop = _this.getUI().prop("scrollTop");
		var iClientHeight = _this.getUI().prop("clientHeight");
		if(iScrollTop < _iLastRepaintScrollTop - _this.getScrollRepaintDelta() 
			|| iScrollTop > _iLastRepaintScrollTop + _this.getScrollRepaintDelta())
		{
			var t = new Date().getTime();
			_this.repaint();
			$("#txtForOutput").val("Repaint used time:" + (new Date().getTime() - t));
			
			_iLastRepaintScrollTop = iScrollTop;
		}
	}
	
	//Override
	this.getName = function()
	{
		return "MainView";
	}
	
	var superProtectedBeforeUpdateUI = this.protectedBeforeUpdateUI;
	//Override
	this.protectedBeforeUpdateUI = function()
	{
		superProtectedBeforeUpdateUI();
		_iLastRepaintScrollTop = 0;
		_iLastScrollTop = 0;
	}
	
	//Override
	this.protectedBeforeRepaint = function()
	{
		var arrRowsRange = this.createRowsRange();
		var iColIdxStart = 0;//_this.getMaxFrozenColumnIdx() + 1;
		var iColIdxEnd = _oTable.getColumnsCount() - 1;
		return [arrRowsRange[0], arrRowsRange[1], iColIdxStart, iColIdxEnd];
	}
	
	//Override
	this.protectedGetPaintRect = function()
	{
		var arrSection = this.createPaintSection();
		var iUp = arrSection[0];
		var iDown = arrSection[1];
		var iLeft = _oUiDependence.getColX(_this.getMaxFrozenColumnIdx() + 1); 
		var iRight = 0x7fffffff;
		return [iUp, iDown, iLeft, iRight];
	}
	
	init();
	
	/**
	 * 封装滚动事件
	 */
	function ScrollEventWrap(evt)
	{
		/** 是否为横向滚动，否则为纵向 */
		this.isHorizontalScroll = function()
		{
			var iScrollTop = _this.getUI().prop("scrollTop");
			return (_iLastScrollTop == iScrollTop);
		}
		
		/** 是否滚到底部了 */
		this.isScrollToBottom = function()
		{
			var iScrollTop = _this.getUI().prop("scrollTop");
			var iClientHeight = _this.getUI().prop("clientHeight");
			var iScrollHeight = _this.getUI().prop("scrollHeight");
			return (iScrollTop + iClientHeight >= iScrollHeight - 2);
		}
	}
}

/**
 * 冻结列的视图，总是“悬停”在左边
 */
function KTableUILeftFrozenView(oTable, oUiDependence)
{
	KTableUIManyRowsView.call(this, oTable, oUiDependence);
	
	var _this = this;
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;
	
	var init = function()
	{
		//_this.getUI().css("border", "1px solid #00ffff");
		_this.getUI().css("overflow", "hidden");
	}
	
	//Override
	this.getName = function()
	{
		return "LeftView";
	}
	
	var superProtectedBeforeUpdateUI = this.protectedBeforeUpdateUI;
	//Override
	this.protectedBeforeUpdateUI = function()
	{
		superProtectedBeforeUpdateUI();
		
		var iMaxColIdx = _this.getMaxFrozenColumnIdx();
		var iWidth = _oUiDependence.getColX(iMaxColIdx + 1);
		_this.getUI().width(iWidth + 1);
	}

	//Override
	this.protectedBeforeRepaint = function()
	{
		var arrRowsRange = this.createRowsRange();
		var iColIdxStart = 0;
		var iColIdxEnd = _this.getMaxFrozenColumnIdx();
		return [arrRowsRange[0], arrRowsRange[1], iColIdxStart, iColIdxEnd];
	}
	
	//Override
	this.protectedGetPaintRect = function()
	{
		var arrSection = this.createPaintSection();
		var iUp = arrSection[0];
		var iDown = arrSection[1];
		var iLeft = 0;
		var iRight = _this.getUI().width();
		return [iUp, iDown, iLeft, iRight];
	}
	
	init();
}

/**
 * 冻结行的视图，总是“悬停”在上方
 */
function KTableUITopFrozenView(oTable, oUiDependence)
{
	KTableUIAbstractView.call(this, oTable, oUiDependence);
	
	var _this = this;
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;
	
	var init = function()
	{
		//_this.getUI().css("border", "1px solid green");
		_this.getUI().css("overflow", "hidden");
	}
	
	//Override
	this.getName = function()
	{
		return "TopView";
	}
	
	//Override
	this.protectedBeforeUpdateUI = function()
	{
		var iMaxRowIdx = _this.getMaxFrozenRowIdx();
		var iHeight = _oUiDependence.getRowY(iMaxRowIdx + 1);
		_this.getUI().height(iHeight + 1);
	}
	
	//Override
	this.protectedBeforeRepaint = function()
	{
		var iRowIdxStart = 0;
		var iRowIdxEnd = _this.getMaxFrozenRowIdx();
		var iColIdxStart = 0;//_this.getMaxFrozenColumnIdx() + 1;
		var iColIdxEnd = _oTable.getColumnsCount() - 1;
		return [iRowIdxStart, iRowIdxEnd, iColIdxStart, iColIdxEnd];
	}
	
	//Override
	this.protectedGetPaintRect = function()
	{
		var iUp = 0;
		var iDown = _this.getUI().height();
		var iLeft = _oUiDependence.getColX(_this.getMaxFrozenColumnIdx() + 1);
		var iRight = 0x7fffffff;
		return [iUp, iDown, iLeft, iRight];
	}
	
	init();
}

/**
 * 冻结行列的左上角视图
 */
function KTableUICornerFrozenView(oTable, oUiDependence)
{
	KTableUIAbstractView.call(this, oTable, oUiDependence);
	
	var _this = this;
	var _oTable = oTable;
	var _oUiDependence = oUiDependence;
	
	var init = function()
	{
		//_this.getUI().css("border", "1px solid blue");
		_this.getUI().css("overflow", "hidden");
	}
	
	//Override
	this.getName = function()
	{
		return "CornerView";
	}
	
	//Override
	this.protectedBeforeUpdateUI = function()
	{
		var iMaxRowIdx = _this.getMaxFrozenRowIdx();
		var iHeight = _oUiDependence.getRowY(iMaxRowIdx + 1);
		_this.getUI().height(iHeight + 1);
		
		var iMaxColIdx = _this.getMaxFrozenColumnIdx();
		var iWidth = _oUiDependence.getColX(iMaxColIdx + 1);
		_this.getUI().width(iWidth + 1);
	}
	
	//Override
	this.protectedBeforeRepaint = function()
	{
		var iRowIdxStart = 0;
		var iRowIdxEnd = _this.getMaxFrozenRowIdx();
		var iColIdxStart = 0;
		var iColIdxEnd = _this.getMaxFrozenColumnIdx();
		return [iRowIdxStart, iRowIdxEnd, iColIdxStart, iColIdxEnd];
	}
	
	//Override
	this.protectedGetPaintRect = function()
	{
		return [0, _this.getUI().height(), 0, _this.getUI().width()];
	}
	
	init();
}

/**
 * 单元格绘制器
 * 可继承此类，实现自定义的绘制器
 */
function KTDefaultCellRender(oTable)
{
	var _oTable = oTable;
	
	var _oCurrentRow;
	var _oCurrentCol;
	var _oCell;
	var _iCurrentRowIdx;
	var _iCurrentColIdx;
	
	var _iCellWidth;
	var _iCellHeight;
	var _iTextAreaWidth;
	var _iTextAreaHeight;
	
	var _oMergeBlock;
	
	var PADDING_H = 2;
	var PADDING_V = 1;
		
	/**
	 * 每次绘制前，框架会通过此接口传入相关信息
	 * @param oRow 当前行对象
	 * @param oCol 当前列对象
	 * @param oCell 单元格对象，可能为空
	 * @param iRowIdx 当前行序号 
	 * @param iColIdx 当前列序号
	 * @param iCellW 内容区域的宽度，是列宽扣除边框线宽和内边距，小于列宽col.getWidth();
	 * @param iCellH 内容区域的高度，是行高扣除边框线宽和内边距，小于行高row.getHeight();
	 * @param iTextW 文字区域的宽度，文字区域可能小于内容区域，且文字区域没有样式，不用考虑边框问题
	 * @param iTextH 文字区域的高度
	 * @param oMergeBlock 如果是融合块主格，应该传入融合块信息
	 */
	this.setContext = function(oRow, oCol, oCell, iRowIdx, iColIdx, iCellW, iCellH, iTextW, iTextH, oMergeBlock)
	{
		_oCurrentRow = oRow;
		_oCurrentCol = oCol;
		_oCell = oCell;
		_iCurrentRowIdx = iRowIdx;
		_iCurrentColIdx = iColIdx;
		
		_iCellWidth = iCellW;
		_iCellHeight = iCellH;
		_iTextAreaWidth = iTextW;
		_iTextAreaHeight = iTextH;
		
		_oMergeBlock = oMergeBlock;
	}
	
	/**
	 * 计算单元格至少需要的高度，用于行高自适应
	 * @param sCssClassName
	 * @return
	 */
	this.calculateCellHeight = function(sCssClassName)
	{
		if(!_oCell || !_oCell.getValue())
		{
			return 0;
		}
		var htmlText = createTextSpan();
		htmlText.className = sCssClassName;
		var iHeight = calculateSize(htmlText);
		return iHeight;
	}
	
	/**
	 * 绘制单元格内容
	 * @param htmlDiv 单元格的DIV
	 * @param htmlTextArea 放文字的容器；可能没有，则文字直接放div中
	 * @return void 
	 */
	this.paintCellUI = function(htmlDiv, htmlTextArea)
	{
		if(!_oCell || !_oCell.getValue())
		{
			return;
		}
		var htmlText = createTextSpan();
		var bWrapText = this.getStyleValue("isWrapText");
		var sVerticalAlign = this.getStyleValue("getVerticalAlign");
		if(sVerticalAlign == "middle")
		{
			if(bWrapText)//多行的垂直居中，位置要算
			{
				var iRealHeight = calculateSize(htmlText, htmlDiv);
				htmlText.style.left = 0;
				htmlText.style.top = ((_iTextAreaHeight - iRealHeight) >> 1) + "px";
				htmlText.style.height = iRealHeight + "px";
			}
			else//单行的垂直居中，用文字行高等于可用高度即可
			{
				var iTextCssHeight = _iTextAreaHeight - PADDING_V * 2;
				htmlText.style.lineHeight = (iTextCssHeight < 0 ? 0 : iTextCssHeight) + "px";
			}
		}
		else if(sVerticalAlign == "bottom")
		{
			htmlText.style.bottom = PADDING_V + "px";
		}
		else //if(sVerticalAlign == "top" || sVerticalAlign == null)//或不认识的属性值
		{
			htmlText.style.top = PADDING_V + "px";
		}
		
		var htmlParent = (htmlTextArea ? htmlTextArea: htmlDiv);
		var htmlOriText = htmlParent.firstChild;
		if(htmlOriText)
		{
			htmlParent.removeChild(htmlOriText);
		}
		htmlParent.appendChild(htmlText);
		
		//单行文字，可以左右蹿出邻近的空白单元格
		var bOutside;
		if(!bWrapText)
		{
			var sTextAlign = this.getStyleValue("getTextAlign");
			var iRightDelta = -1;
			var iLeftDelta = -1;
			if(sTextAlign == "left" || sTextAlign == "center" || sTextAlign == null)
			{
				iRightDelta = 0;
				var iCols = _oTable.getColumnsCount();
				for(var i = _iCurrentColIdx + 1; i < iCols ; i++)//向后找空白邻居
				{
					var oTempCell = _oCurrentRow.getCellForDraw(i);
					if(oTempCell && oTempCell.getValue())
					{
						break;
					}
					if(!_oTable.getColumn(i).isHide() && (!_oMergeBlock || i > _oMergeBlock.getColIdxTo()))
					{
						iRightDelta += _oTable.getColumn(i).getWidth();
					}
				}
			}
			if(sTextAlign == "right" || sTextAlign == "center")
			{
				iLeftDelta = 0;
				if(!_oCell.getTreeModel() || _oCell.getTreeModel().isHorizontal())//纵向树不左蹿,避免盖住收展+-
				{
					for(var i = _iCurrentColIdx - 1; i >= 0; i--)//向前找空白邻居
					{
						var oTempCell = _oCurrentRow.getCellForDraw(i);
						if(oTempCell && oTempCell.getValue())
						{
							break;
						}
						if(!_oTable.getColumn(i).isHide())
						{
							iLeftDelta += _oTable.getColumn(i).getWidth();
						}
					}
				}
			}
			var iTextWidth = _iTextAreaWidth;
			if(iRightDelta >= 0)
			{
				//左对齐，只要将文字span改得比容器大。居中也会到此，将文字宽度累加大。
				iTextWidth += iRightDelta;
				var iTextCssWidth = iTextWidth - PADDING_H * 2;
				htmlText.style.width = (iTextCssWidth < 0 ? 0 : iTextCssWidth) + "px";
			}
			if(iLeftDelta >= 0)
			{
				//文字右对齐、出框，当文字很多时，HTML的表现并不是从左蹿出(变成相当于左对齐，从右蹿出)。
				//支持可能有很多文字的右对齐，需要一个超出单元格范围的可视区域，
				//而且相对于它的内容(文字span)，它也是个裁剪区域。
				var htmlVisibleRect = document.createElement("span");
				htmlVisibleRect.style.overflow = "hidden";
				htmlVisibleRect.style.position = "absolute";
				htmlVisibleRect.style.left = -iLeftDelta + "px";
				htmlVisibleRect.style.width = (iTextWidth + iLeftDelta) + "px";
				if(_iTextAreaHeight < 0)
				{
					_iTextAreaHeight = 0;
				}
				htmlVisibleRect.style.height = _iTextAreaHeight + "px";
				
				htmlText.style.width = "";
				if(sTextAlign == "center")//水平居中在此基础上还要算位置
				{
					htmlText.style.whiteSpace = "nowrap";
					var iRealWidth = calculateSize(htmlText, htmlDiv, "offsetWidth");
					htmlText.style.left = ((_iTextAreaWidth - iRealWidth) >> 1) + iLeftDelta + "px";
				}
				else
				{
					htmlText.style.right = 0;
					htmlText.style.left = "";
				}
				
				htmlVisibleRect.appendChild(htmlText);
				htmlParent.appendChild(htmlVisibleRect);
			}
			bOutside = (iRightDelta > 0 || iLeftDelta > 0);
		}
		//当有出框的要求时，单元格（及可能存在的文字区域）要改成不裁剪。
		htmlDiv.style.overflow = (bOutside ? "visible" : "hidden");
		if(htmlTextArea)
		{
			htmlTextArea.style.overflow = (bOutside ? "visible" : "hidden");
		}
	}
	
	var createTextSpan = function()
	{
		var htmlText = document.createElement("span");
		htmlText.style.paddingLeft = PADDING_H + "px";
		htmlText.style.paddingRight = PADDING_H + "px";
		htmlText.style.overflow = "hidden";
		htmlText.style.position = "absolute";
		htmlText.style.left = 0;
		var iTextAreaCssWidth = _iTextAreaWidth - PADDING_H * 2;
		htmlText.style.width = (iTextAreaCssWidth < 0 ? 0 : iTextAreaCssWidth) + "px";
		if(typeof(htmlText.innerText) == "undefined")//FF
		{
			htmlText.textContent = _oCell.getValue();
		}
		else
		{
			htmlText.innerText = _oCell.getValue();
		}
		return htmlText;
	}
	
	var calculateSize = function(htmlText, htmlCssParent, sAttrName)
	{
		var sOriLeft = htmlText.style.left;
		var sOriTop = htmlText.style.top;
		htmlText.style.left = "-32768px";
		htmlText.style.top = "-32768px";
		if(htmlCssParent)
		{
			htmlText.className = reuseCssClassName(htmlCssParent);
		}
		document.body.appendChild(htmlText);
		var iRealSize = htmlText[sAttrName ? sAttrName : "offsetHeight"];
		document.body.removeChild(htmlText);
		htmlText.className = "";
		htmlText.style.left = sOriLeft;
		htmlText.style.top = sOriTop;
		return iRealSize;
	}
	
	//放文字的span在放入HTML页面中试算大小前，需要应用单元格的字号等样式。
	var reuseCssClassName = function(htmlDiv)
	{
		var sNames = htmlDiv.className;
		if(!sNames)
		{
			return "";
		}
		var arrNames = sNames.split(" ");
		sNames = "";
		for(var i = 0; i < arrNames.length; i++)
		{
			if(arrNames[i].indexOf(KTBorderStyle.CSS_ID_PREFIXE) == 0)
			{
				continue;
			}
			if(sNames.length > 0)
			{
				sNames += " ";
			}
			sNames += arrNames[i];
		}
		return sNames;
	}
	
	/** 
	 * 获取融合后的样式值，即单元格没有值则向行列取，行列没有值则向表格取
	 * @param sMethodName e.g. "getColor", "getFontSize", "isWarpText"...
	 * @return 到表格还取不到则返回null
	 */
	this.getStyleValue = function(sMethodName)
	{
		return _oTable.getStyleValue(_oCell, _oCurrentCol, _oCurrentRow, "getStyle", sMethodName, null);
	}
	
	//以下getter，当此类被继承时子类中可用。

	/** 当前行 */
	this.getCurrentRow = function()
	{
		return _oCurrentRow;
	}
	/** 当前列 */
	this.getCurrentCol = function()
	{
		return _oCurrentCol;
	}
	/** 单元格对象 */
	this.getCell = function()
	{
		return _oCell;
	}
	/** 当前行序号 */
	this.getCurrentRowIdx = function()
	{
		return _iCurrentRowIdx;
	}
	/** 当前列序号 */
	this.getCurrentColIdx = function()
	{
		return _iCurrentColIdx;
	}
	
	/** 单元格的CSS宽度 */
	this.getCellWidth = function()
	{
		return _iCellWidth;
	}
	/** 单元格的CSS高度 */
	this.getCellHeight = function()
	{
		return _iCellHeight;
	}
	/** 文字区域的宽度 */
	this.getTextAreaWidth = function()
	{
		return _iTextAreaWidth;
	}
	/** 文字区域的高度 */
	this.getTextAreaHeight = function()
	{
		return _iTextAreaHeight;
	}
	
	this.protectedMethod = new (function()
	{
		this.setTextAreaHeight = function(iTextAreaHeight)
		{
			_iTextAreaHeight = iTextAreaHeight;
		}
	})();
}

/**
 * 嵌入对象绘制器
 */
function KTDefaultEmbedObjectRender()
{
	this.paintEmbedObject = function(oEmbedObject, jqOwner)
	{
		//须按此接口实现，并通过setEmbedObjectRender()传入控件。
	}
}

/**
 * 树节点操作柄绘制器
 */
function KTDefaultTreeHandlerRender(oTable)
{
	var HANDLER_SIZE = 9;//收展操作的方框大小，不含边框
	var TAB_SIZE = 17;
	var MARGIN_BEFORE = 2;
	var MARGIN_AFTER = 4;
	
	var _oTable = oTable;
	var _oUiDependence;
	
	var getTable = function()
	{
		return _oTable;
	}
	
	this.setUiDependence = function(oUiDependence)
	{
		_oUiDependence = oUiDependence;
	}
	var getUiDependence = function()
	{
		return _oUiDependence;
	}
	
	/**
	 * 创建一个树操作柄，以及相同单元格里的文字容器
	 * @return [htmlTreeHandler, htmlTextArea] 其中htmlTreeHandler可能为空
	 */
	this.create = function(oTreeModel, iRowIdx, iColIdx, iWidth, iHeight)
	{
		var arrResult = createTreeHandler(oTreeModel, iRowIdx, iColIdx, iWidth, iHeight);
		var iTextX = arrResult[1];
		var iTextY = arrResult[2];
		var iTextW = iWidth - iTextX;
		var iTextH = iHeight - iTextY;
		var htmlTextArea = createAbsoluteHtmlElement("span", iTextX, iTextY, iTextW, iTextH);
		return [arrResult[0], htmlTextArea];
	}
	
	//return [htmlTreeHandler, iTextX, iTextY]
	var createTreeHandler = function(oTreeModel, iRowIdx, iColIdx, iWidth, iHeight)
	{
		var iX, iY, iW, iH, iTextX, iTextY;
		if(oTreeModel.isHorizontal())
		{
			iX = 0;
			iY = oTreeModel.getLevel() * TAB_SIZE;
			iW = iWidth;
			iH = MARGIN_BEFORE + HANDLER_SIZE + 2 + MARGIN_AFTER;//2是方框的边框
			iTextX = 0;
			iTextY = iY + iH;
		}
		else
		{
			iX = oTreeModel.getLevel() * TAB_SIZE;
			iY = 0;
			iW = MARGIN_BEFORE + HANDLER_SIZE + 2 + MARGIN_AFTER;//2是方框的边框
			iH = iHeight;
			iTextX = iX + iW;
			iTextY = 0;
		}
		var htmlTreeHandler = null;
		if(oTreeModel.isHaveHandlerAlways() || isTreeNodeHasChildren(oTreeModel, iRowIdx, iColIdx))
		{
			//最外层不可见，包含边距使点击的响应范围更大
			htmlTreeHandler = createAbsoluteHtmlElement("div", iX, iY, iW, iH);
			//方框
			if(oTreeModel.isHorizontal())
			{
				iX = ((iWidth - HANDLER_SIZE - 2) >> 1);
				iY = MARGIN_BEFORE;
			}
			else
			{
				iX = MARGIN_BEFORE;
				iY = ((iHeight - HANDLER_SIZE - 2) >> 1);
			}
			var htmlRect = createAbsoluteHtmlElement("div", iX, iY, HANDLER_SIZE, HANDLER_SIZE);
			htmlRect.style.border = "1px solid #8A9EBF";
			if(typeof(htmlRect.style.borderRadius) != "undefined")//IE6连圆角属性都没有
			{
				htmlRect.style.borderRadius = "3px";
			}
			htmlRect.style.backgroundColor = "#FFFFFF";
			htmlTreeHandler.appendChild(htmlRect);
			
			var PADDING = 1;//加减号坐标主动向内缩，不是容器的padding属性
			iX = PADDING;
			iY = PADDING;
			if(oTreeModel.isExpanded())//减号
			{
				iW = HANDLER_SIZE - PADDING * 2;
				iH = (iW >> 1);
				var htmlMinus = createAbsoluteHtmlElement("div", iX, iY, iW, iH);
				htmlMinus.style.borderBottom = "1px solid black";
				htmlRect.appendChild(htmlMinus);
			}
			else//加号
			{
				var iSize = ((HANDLER_SIZE - PADDING * 2) >> 1);
				//右下有线
				var htmlPlus1 = createAbsoluteHtmlElement("div", iX, iY, iSize, iSize);
				htmlPlus1.style.borderBottom = "1px solid black";
				htmlPlus1.style.borderRight = "1px solid black";
				iX += iSize;
				iY += iSize;
				//左上有线，拼成十字
				var htmlPlus2 = createAbsoluteHtmlElement("div", iX, iY, iSize, iSize);
				htmlPlus2.style.borderTop = "1px solid black";
				htmlPlus2.style.borderLeft = "1px solid black";
				htmlRect.appendChild(htmlPlus1);
				htmlRect.appendChild(htmlPlus2);
			}
		}
		return [htmlTreeHandler, iTextX, iTextY];
	}
	
	var isTreeNodeHasChildren = function(oTreeModel, iRowIdx, iColIdx)
	{
		var oNextCell;
		if(oTreeModel.isHorizontal())
		{
			if(iColIdx == _oTable.getColumnsCount() - 1)
			{
				return false;
			}
			oNextCell = _oTable.getRow(iRowIdx).getCellForDraw(iColIdx + 1);
		}
		else
		{
			if(iRowIdx == _oTable.getRowsCount() - 1)
			{
				return false;
			}
			oNextCell = _oTable.getRow(iRowIdx + 1).getCellForDraw(iColIdx);
		}
		return (oNextCell && oNextCell.getTreeModel() 
			&& oNextCell.getTreeModel().getLevel() > oTreeModel.getLevel());
	}
	
	var createAbsoluteHtmlElement = function(sType, iX, iY, iWidth, iHeight)
	{
		var htmlDiv = document.createElement(sType);
		htmlDiv.style.overflow = "hidden";
		htmlDiv.style.position = "absolute";
		htmlDiv.style.left = iX + 'px';
		htmlDiv.style.top = iY + 'px';
		htmlDiv.style.width = iWidth + 'px';
		htmlDiv.style.height = iHeight + 'px';
		return htmlDiv;
	}
	
	this.protectedMethod = 
	{
		"getTable": getTable,
		"getUiDependence": getUiDependence,
		"isTreeNodeHasChildren": isTreeNodeHasChildren,
		"createAbsoluteHtmlElement": createAbsoluteHtmlElement
	}
}
