//
// 金蝶软件（中国）有限公司版权所有.
// 
// Along 创建于 2012-9-21 
//

//import ktable-model.js
//import ktable-ui.js

/**
 * 表格控件
 */
function KTable()
{
	var _this = this;
	var _sId = "table" + (++KTable.iFLowId);
	
	var _oListenerProxy = new KTListenerProxy();
	
	var _arrColumns = [];//列对象模型
	var _arrRows = [];//行对象模型
	var _arrMergeBlocks = [];//融合块模型
	
	var _oStyle;//表格级的通用样式
	var _oBorder;//表格级的边框样式
	
	var _arrEmbedObject = [];//嵌入对象模型

	var _oStyleManager = new KTStyleManager();//管理样式共享
			
	var _oSelectionModel = new KTSelectionModel(this);//记录选中状态
	
	var _oUI;//UI类
	var _oCellRender;//单元格绘制器
	var _oEmbedObjectRender;//嵌入对象绘制器
	var _oTreeHandlerRender;//树的操作柄绘制器 
	
	var _iFrozenRows = 0;//冻结行数
	var _iFrozenColumns = 0;//冻结列数
	
	var _funSelectionRender;//可自定义选中绘制器
	var _bMouseDownSelectingMode = true;//鼠标按下即选中
	
	var _isColumnFitVisibleWidth = false;//调整列宽使不出滚动条且占满界面宽度
	var _isAutoAdjustRowHeight = false;//行高自适应
	
	var _bSyncMergeBlockWhenModelChanged = true;
	
	new KTCell();//木偶，为了使KTCell.Path内部类存在
	
	/** 同一页面可以有多个表格实例，每一个有唯一标识 */
	this.getId = function()
	{
		return _sId;
	}
	
	var getUiObject = function()
	{
		if(!_oUI)
		{
			_oUI = new KTableUI(_this);
			_oUI.addListener("scroll", scrollHandler);
			_oUI.addListener("mousedown", selectHandler);
			_oUI.addListener("click", selectHandler);
			_oUI.addListener("click", mouseClickHandler);
			//_oUI.addListener("dblclick", function(strType, oEventWrap){alert("Double click");});
		}
		return _oUI;
	}
	
	/**
	 * 获取控件UI--是一个HTML元素
	 */
	this.getUI = function()
	{
		return getUiObject().getHtmlElement();
	}
	
	/** 添加一列，可以给列命名--指定一个字符串的键，返回列对象 */
	this.addColumn = function(strKey)
	{
		return this.insertColumn(_arrColumns.length, strKey);
	}
	
	/** 添加若干列 */
	this.addColumns = function(iCols)
	{
		for(var i = 0; i < iCols; i++)
		{
			this.addColumn();
		}
	}
	
	/** 在指定位置插入一列，可以给列命名--指定一个字符串的键，返回列对象 */
	this.insertColumn = function(iIdx, strKey)
	{
		if(iIdx < 0 || iIdx > _arrColumns.length)
		{
			throw new Error("Illegal argument.");
		}
		var oCol = new KTColumn(propertyChangeHandler, strKey);
		_arrColumns.splice(iIdx, 0, oCol);
		for(var i = 0; i < _arrRows.length; i++)
		{
			//现有行补单元格
			_arrRows[i].$innerInsertCell(iIdx);
		}
		syncMergeBlocks(false, iIdx, true);
		//同步UI
		modelChangeHandler(oCol, KTableUI.INSERT_COL);
		return oCol;
	}
	
	/** 删除指定位置的列 */
	this.removeColumn = function(iIdx)
	{
		if(iIdx < 0 || iIdx > _arrColumns.length)
		{
			throw new Error("Illegal argument.");
		}
		var oCol = _arrColumns[iIdx];
		//先同步UI再处理模型
		//modelChangeHandler(oCol, KTableUI.REMOVE_COL);
		oCol.$innerDestroy();
		_arrColumns.splice(iIdx, 1);
		for(var i = 0; i < _arrRows.length; i++)
		{
			//现有行移除单元格
			_arrRows[i].$innerRemoveCell(iIdx);
		}
		syncMergeBlocks(false, iIdx, false);
		//先处理模型，再同步ui update by hassan 10.26
		modelChangeHandler(oCol, KTableUI.REMOVE_COL);
	}
	
	/** 有多少列 */
	this.getColumnsCount = function()
	{
		return _arrColumns.length;
	}
	
	/** 
	 * 取得指定序号的列对象 
	 * @param arg 大于等于0，小于总列数的整数下标， 或，列的字符串标识(KTColumn.getKey)。
	 * @return 如果用下标，总能取得到；如果用字符串标识，取不到则返回null。
	 * @throws 下标越界会抛异常；参数不是数字或字符串会抛异常。
	 */
	this.getColumn = function(arg)
	{
		var strType = typeof(arg);
		if(strType == "number")
		{
			if(arg < 0 || arg > _arrColumns.length)
			{
				throw new Error("Illegal argument.");
			}
			return _arrColumns[arg];
		}
		else if(strType == "string")
		{
			for(var j = 0; j < _arrColumns.length; j++)
			{
				if(_arrColumns[j].getKey() == arg)
				{
					return _arrColumns[j];
				}
			}
			return null;
		}
		else
		{
			throw new Error("Unknown argument.");
		}
	}
	
	/** 
	 * 取列的序号
	 * @param arg 列对象KTColumn的实例或列的字符串标识(KTColumn.getKey)
	 * @return 不存在则返回-1
	 * @throws 参数不是列对象或字符串会抛异常。
	 */
	this.getColumnIndex = function(arg)
	{
		var bColObj = false;
		if(arg instanceof KTColumn)
		{
			bColObj = true;
		}
		else if(typeof(arg) != "string")
		{
			throw new Error("Unknown argument.");
		}
		
		for(var j = 0; j < _arrColumns.length; j++)
		{
			if(bColObj)
			{
				if(_arrColumns[j] == arg)
				{
					return j;
				}
			}
			else
			{
				if(_arrColumns[j].getKey() == arg)
				{
					return j;
				}
			}
		}
		return -1;
	}
	
	/** 添加一行，返回行对象 */
	this.addRow = function()
	{
		return this.insertRow(_arrRows.length);
	}
	
	/** 添加若干行 */
	this.addRows = function(iRows)
	{
		for(var i = 0; i < iRows; i++)
		{
			this.addRow();
		}
	}
	
	/** 在指定序号位置插入一行，返回行对象 */
	this.insertRow = function(iIdx)
	{
		if(iIdx < 0 || iIdx > _arrRows.length)
		{
			throw new Error("Illegal argument.");
		}
		var oRow = new KTRow(this.getColumnsCount(), propertyChangeHandler);
		_arrRows.splice(iIdx, 0, oRow);
		syncMergeBlocks(true, iIdx, true);
		//同步UI
		modelChangeHandler(oRow, KTableUI.INSERT_ROW);
		return oRow;
	}
	
	/** 删除指定位置的行 */
	this.removeRow = function(iIdx)
	{
		if(iIdx < 0 || iIdx > _arrRows.length)
		{
			throw new Error("Illegal argument.");
		}
		var oRow = _arrRows[iIdx];
		/* 先同步UI再处理模型 by along */
		//modelChangeHandler(oRow, KTableUI.REMOVE_ROW);
		oRow.$innerDestroy();
		_arrRows.splice(iIdx, 1);
		syncMergeBlocks(true, iIdx, false);
		//先处理模型，再同步ui update by hassan 10.26
		modelChangeHandler(oRow, KTableUI.REMOVE_ROW);
	}
	
	/** 有多少行 */
	this.getRowsCount = function()
	{
		return _arrRows.length;
	}
	
	/** 取得指定序号的行对象 */
	this.getRow = function(iIdx)
	{
		return _arrRows[iIdx];
	}
	
	/** 取行对象的序号 */
	this.getRowIndex = function(oRow)
	{
		//如果建立一个以oRow.getKey()的键的Map，速度可提升多少？
		for(var i = 0; i < _arrRows.length; i++)
		{
			if(_arrRows[i] == oRow)
			{
				return i;
			}
		}
		return -1;
	}
	
	/** 创建或重新生成UI */
	this.updateUI = function()
	{
		getUiObject().updateUI();
	}

	var _bOriSyncUI;//用于懒加载数据时，关闭自动刷新前，记录原有状态，以便事后恢复。
	var _iOriRows;//用于懒加载数据时，记录添加数据前的行数。
	
	/** 
	 * 此接口用于滚动到底部，动态添加数据的前后。
	 * 示例：
	 * lazyAppendData(true);//开启提示
	 * table.addRows(...);
	 * lazyAppendData(false);//关闭提示，刷新视图
	 */
	this.lazyAppendData = function(bStartOtherwiseEnd)
	{
		if(bStartOtherwiseEnd)
		{
			_iOriRows = _this.getRowsCount();
			_bOriSyncUI = _this.isSyncUIWhenModelChanged();
			_this.setSyncUIWhenModelChanged(false);
			//getUiObject().showPromptForLazyAppendData(true);
		}
		else
		{
			//getUiObject().showPromptForLazyAppendData(false);
			getUiObject().repaintAfterLazyAppendData(_iOriRows);
			_this.setSyncUIWhenModelChanged(_bOriSyncUI);
		}
	}
	
	/** 
	 * 此接口用于树的子节点懒加载，动态添加数据的前后。
	 * 示例：
	 * lazyAppendDataByTree(true, oTreeModel);//开启提示
	 * table.insertRow(...);
	 * lazyAppendDataByTree(false, oTreeModel);//关闭提示，刷新视图
	 */
	this.lazyAppendDataByTree = function(bStartOtherwiseEnd, oTreeModel)
	{
		if(bStartOtherwiseEnd)
		{
			//记录原来自动刷新状态，并关闭之
			_bOriSyncUI = _this.isSyncUIWhenModelChanged();
			_this.setSyncUIWhenModelChanged(false);
			//出提示
			getUiObject().showPromptForLazyAppendData(true);
		}
		else
		{
			//关闭提示
			getUiObject().showPromptForLazyAppendData(false);
			//打开自动刷新，并触发之
			oTreeModel.setExpanded(false);
			_this.setSyncUIWhenModelChanged(true);
			oTreeModel.setExpanded(true);
			//恢复原来的自动刷新状态
			_this.setSyncUIWhenModelChanged(_bOriSyncUI);
		}
	}
	
	/** 开启/关闭大数据模式 */
	this.setLargeDataMode = function(b)
	{
		getUiObject().setScrollDynamicRepaint(b);	
	}
	/** 大数据模式 */
	this.isLargeDataMode = function()
	{
		return getUiObject().isScrollDynamicRepaint();
	}

	/** 模型任一处改变，即时同步UI */
	this.setSyncUIWhenModelChanged = function(b)
	{
		getUiObject().setSyncUIWhenModelChanged(b);
	}
	this.isSyncUIWhenModelChanged = function()
	{
		return getUiObject().isSyncUIWhenModelChanged();
	}
	
	/** 行列增删是否推着融合块走 */
	this.setSyncMergeBlockWhenModelChanged = function(b)
	{
		_bSyncMergeBlockWhenModelChanged = b;
	}
	this.isSyncMergeBlockWhenModelChanged = function()
	{
		return _bSyncMergeBlockWhenModelChanged;
	}
		
	/** 可以设置自定义的单元格绘制器--继承自KTDefaultCellRender */
	this.setCellRender = function(oCellRender)
	{
		_oCellRender = oCellRender;
	}
	/** 取得单元格绘制器 */
	this.getCellRender = function()
	{
		if(!_oCellRender)
		{
			_oCellRender = new KTDefaultCellRender(this);
		}
		return _oCellRender;
	}

	/** 设置嵌入对象绘制器--继承自KTDefaultEmbedObjectRender */
	this.setEmbedObjectRender = function(oEmbedObjectRender)
	{
		_oEmbedObjectRender = oEmbedObjectRender;
	}
	/** 取得嵌入对象绘制器 */
	this.getEmbedObjectRender = function()
	{
		if(!_oEmbedObjectRender)
		{
			_oEmbedObjectRender = new KTDefaultEmbedObjectRender();
		}
		return _oEmbedObjectRender;
	}
	
	/** 可以设置自定义的树操作柄绘制器--KTDefaultTreeHandlerRender */
	this.setTreeHandlerRender = function(oTreeHandlerRender)
	{
		_oTreeHandlerRender = oTreeHandlerRender;
	}
	/** 取得树操作柄绘制器 */
	this.getTreeHandlerRender = function()
	{
		if(!_oTreeHandlerRender)
		{
			_oTreeHandlerRender = new KTDefaultTreeHandlerRender(this);
		}
		return _oTreeHandlerRender;
	}	
	
	/** 获取共享样式管理器 */
	this.getStyleManager = function()
	{
		return _oStyleManager;
	}
	
	//start MergeBlock
	/** 添加融合块 */
	this.addMergeBlock = function(oMergeBlock)
	{
		if(getMergeBlockIdx(oMergeBlock) < 0)//使不重复
		{
			_arrMergeBlocks.push(oMergeBlock);
			modelChangeHandler(oMergeBlock, KTableUI.ADD_MERGEBLOCK);
		}
	}
	
	/** 移除融合块 */
	this.removeMergeBlock = function(oMergeBlock)
	{
		var idx = getMergeBlockIdx(oMergeBlock);
		if(idx >= 0)
		{
			_arrMergeBlocks.splice(idx, 1);
			modelChangeHandler(oMergeBlock, KTableUI.REMOVE_MERGEBLOCK);
		}
	}
	
	/** 拿到融合块中有用的单元格，类似于主格的意味 */
	var getAvailableCellOfMergeBlock = function(iRowIdx, iColIdx)
	{
		var oMergeBlock = null;
		for(var i = 0; i < _arrMergeBlocks.length; i++)
		{
			if(_arrMergeBlocks[i].isContainCell(iRowIdx, iColIdx))
			{
				oMergeBlock = _arrMergeBlocks[i];
				break;
			}
		}
		if(oMergeBlock)
		{
			for(var m = oMergeBlock.getRowIdxFrom(); m <= oMergeBlock.getRowIdxTo(); m++)
			{
				var oRow = _this.getRow(m);
				for(var n = oMergeBlock.getColIdxFrom(); n <= oMergeBlock.getColIdxTo(); n++)
				{
					var oCell = oRow.getCell(n, true);
					if(oCell)
					{
						return oCell;
					}
				}
			}
		}
	}
	
	var getMergeBlockIdx = function(oMergeBlock)
	{
		for(var i = 0; i < _arrMergeBlocks.length; i++)
		{
			if(oMergeBlock.equals(_arrMergeBlocks[i]))
			{
				return i;
			}
		}
		return -1;
	}
	
	/** 提供给UI绘制时访问所有融合块的接口，不要当控件API用。 */
	this.getMergeBlocks = function()
	{
		return _arrMergeBlocks;
	}
	
	//插入删除行列影响融合块
	var syncMergeBlocks = function(bRow, iRowIdx, bInsert)
	{
		if(!_bSyncMergeBlockWhenModelChanged)
		{
			return;
		}
		var sSetFrom, sSetTo, sGetFrom, sGetTo;
		if(bRow)//行 
		{
			sSetFrom = "setRowIdxFrom";
			sGetFrom = "getRowIdxFrom"
			sSetTo = "setRowIdxTo";
			sGetTo = "getRowIdxTo";
		}
		else//列
		{
			sSetFrom = "setColIdxFrom";
			sGetFrom = "getColIdxFrom"
			sSetTo = "setColIdxTo";
			sGetTo = "getColIdxTo";
		}
		for(var i = _arrMergeBlocks.length - 1; i >= 0; i--)
		{
			var oMergeBlock = _arrMergeBlocks[i];
			if(bInsert)//插入
			{
				if(iRowIdx <= oMergeBlock[sGetFrom]())
				{
					oMergeBlock[sSetFrom](oMergeBlock[sGetFrom]() + 1);
					oMergeBlock[sSetTo](oMergeBlock[sGetTo]() + 1);
				}
				else if(iRowIdx <= oMergeBlock[sGetTo]())
				{
					oMergeBlock[sSetTo](oMergeBlock[sGetTo]() + 1);
				}
			}
			else//删除
			{
				var bDone = false;
				if(iRowIdx < oMergeBlock[sGetFrom]())
				{
					oMergeBlock[sSetFrom](oMergeBlock[sGetFrom]() - 1);
					oMergeBlock[sSetTo](oMergeBlock[sGetTo]() - 1);
					bDone = true;
				}
				else if(iRowIdx <= oMergeBlock[sGetTo]())
				{
					oMergeBlock[sSetTo](oMergeBlock[sGetTo]() - 1);
					bDone = true;
				}
				
				if(bDone && oMergeBlock.isInvalid())//删没了
				{
					_arrMergeBlocks.splice(i, 1);
				}
			}
		}
	}
	//end MergeBlock
	
	/** 设置全局的样式对象 */
	this.setStyle = function(oStyle)
	{
		_oStyle = oStyle;
	}
	/** 获取全局的样式对象 */
	this.getStyle = function()
	{
		return _oStyle;
	}
	
	/** 设置全局的边框样式对象 */
	this.setBorder = function(oBorder)
	{
		_oBorder = oBorder;
	}
	/** 获取全局的边框样式对象 */
	this.getBorder = function()
	{
		return _oBorder;
	}
	
	/** 
	 * 获取合并后的样式值，即单元格没有值则向行列取，行列没有值则向表格取
	 * @param sStyleMethodName e.g. "getStyle" or "getBorder"
	 * @param sPropertyMethodName e.g. "getColor", "getFontSize", "isWarpText"...
	 * @return 到表格还取不到则返回指定的缺省值oDefaultValue
	 */
	this.getStyleValue = function(oCell, oCol, oRow, sStyleMethodName, sPropertyMethodName, oDefaultValue)
	{
		var oStyle;
		var value;
		if(oCell)
		{
			oStyle = oCell[sStyleMethodName]();//方法当属性访问，再加括号()变成函数
			if(oStyle)
			{
				value = oStyle[sPropertyMethodName]();
				if(value || value === 0 || value === false)
				{
					return value;
				}
			}
		}
		oStyle = oCol[sStyleMethodName]();
		if(oStyle)
		{
			value = oStyle[sPropertyMethodName]();
			if(value || value === 0 || value === false)
			{
				return value;
			}
		}
		oStyle = oRow[sStyleMethodName]();
		if(oStyle)
		{
			value = oStyle[sPropertyMethodName]();
			if(value || value === 0 || value === false)
			{
				return value;
			}
		}
		oStyle = _this[sStyleMethodName]();
		if(oStyle)
		{
			value = oStyle[sPropertyMethodName]();
			if(value || value === 0 || value === false)
			{
				return value;
			}
		}
		return oDefaultValue;
	}
	
	/** 添加一个嵌入对象 */
	this.addEmbedObject = function(oEmbedObject)
	{
		if(getEmbedObjectIdx(oEmbedObject) >= 0)
		{
			throw new Error("EmbedObjcet ID already exist.");
		}
		oEmbedObject.$innerBindChangeListener(embedObjectPropertyChangeHandler);
		_arrEmbedObject.push(oEmbedObject);
		//modelChangeHandler(oEmbedObject, KTableUI.ADD_);
	}
	
	/** 移除一个嵌入对象 */
	this.removeEmbedObject = function(oEmbedObject)
	{
		var idx = getEmbedObjectIdx(oEmbedObject);
		if(idx >= 0)
		{
			oEmbedObject = _arrEmbedObject[idx];
			oEmbedObject.$innerBindChangeListener(null);
			_arrEmbedObject.splice(idx, 1);
			//modelChangeHandler(oEmbedObject, KTableUI.REMOVE_);
		}
	}
	
	/** 取得指定ID的嵌入对象，可能不存在则返回null */
	this.getEmbedObject = function(sId)
	{
		var iIdx = getEmbedObjectIdx(new KTEmbedObject(sId));
		return iIdx >= 0 ? _arrEmbedObject[iIdx] : null;
	}
	
	var getEmbedObjectIdx = function(oEmbedObject)
	{
		for(var i = 0; i < _arrEmbedObject.length; i++)
		{
			if(oEmbedObject.getId() == _arrEmbedObject[i].getId())
			{
				return i;
			}
		}
		return -1;
	}
	
	/** 提供给UI绘制时访问所有嵌入对象的接口，不要当控件API用。 */
	this.getEmbedObjects = function()
	{
		return _arrEmbedObject;
	}
	
	var embedObjectPropertyChangeHandler = function(oEmbedObject, sKey, value, oldValue)
	{
		propertyChangeHandler(oEmbedObject, sKey, value, oldValue);
	}
	
	
	/** 添加单元格点击事件监听 funListener(strType, oEventWrap)*/
	this.addCellClickListener = function(funListener)
	{
		_oListenerProxy.addListener("cell-click", funListener);
	}
	
	/** 移除单元格点击事件监听 */
	this.removeCellClickListener = function(funListener)
	{
		_oListenerProxy.removeListener("cell-click", funListener);
	}
	
	/** 添加树节点展开/收起事件，可用于动态添加数据 */
	this.addTreeExpandListener = function(funListener)
	{
		_oListenerProxy.addListener("tree-expand", funListener);
	}
	
	/** 移除树节点展开/收起事件 */
	this.removeTreeExpandListener = function(funListener)
	{
		_oListenerProxy.removeListener("tree-expand", funListener);
	}
	
	//响应UI的click事件，判断落在单元格上，再向外发cell-click或tree-expand等事件。
	var mouseClickHandler = function(strType, oInnerEvent)
	{
		if(!oInnerEvent.isCellPointed())
		{
			return;
		}
		var oPath = oInnerEvent.getMouseTargetModel();
		var oCell = oPath.getCell();
		if(oInnerEvent.isPointTreeHandler())
		{
			if(oInnerEvent.isLeftButton())//此处可以做右键出收展第1~5级的菜单
			{
				var bOriSyncUI = _this.isSyncUIWhenModelChanged();
				_this.setSyncUIWhenModelChanged(true);
				
				var oTreeModel = oCell.getTreeModel();
				oTreeModel.setExpanded(!oTreeModel.isExpanded());
				
				_this.setSyncUIWhenModelChanged(bOriSyncUI);
				
				var oEvent = new KTTreeExpandEvent(oCell, oPath.getRowIndex(), oPath.getColIndex());
				_oListenerProxy.fireListener("tree-expand", oEvent);
				return;
			}
		}
		var oEvt = oInnerEvent.getOriginalEvent();
		//if(!oCell)
		//{
		var oMergeCell = getAvailableCellOfMergeBlock(oPath.getRowIndex(), oPath.getColIndex());
		oCell = oMergeCell ? oMergeCell : oCell;
		//}
		var oEvent = new KTCellClickEvent(oEvt, oInnerEvent.getX(), oInnerEvent.getY(), oCell, oPath.getCol(), oPath.getRow());
		_oListenerProxy.fireListener("cell-click", oEvent);
	}
	
	
	/** 添加滚动至底端事件，可用于动态添加数据 */
	this.addScrollToBottomListener = function(funListener)
	{
		_oListenerProxy.addListener("scroll-to-bottom", funListener);
	}
	
	/** 移除滚动至底端事件 */
	this.removeScrollToBottomListener = function(funListener)
	{
		_oListenerProxy.removeListener("scroll-to-bottom", funListener);
	}
	
	//响应UI的scroll事件，判断是否滚至底端，再向外发scroll-to-bottom事件。
	var scrollHandler = function(strType, oEventWrap)
	{
		if(!oEventWrap.isHorizontalScroll() && oEventWrap.isScrollToBottom())
		{
			_oListenerProxy.fireListener("scroll-to-bottom", oEventWrap);
		}
	}


	/** 添加UI事件监听，可用于调试，不推荐调用 */
	this.addUIListener = function(strType, funListener)
	{
		getUiObject().addListener(strType, funListener);
	}
	
	/** 移除UI事件监听 */
	this.removeUIListener = function(strType, funListener)
	{
		getUiObject().removeListener(strType, funListener);
	}

	
	//模型属性改变事件处理
	var propertyChangeHandler = function(oModel, sPropertyName, value, oldValue)
	{
		if(!_oUI || !_oUI.isSyncUIWhenModelChanged())
		{
			return;
		}
		if(oModel instanceof KTCell.Path)
		{
			//如果是单元格，补上行序号和列对象，再发给UI
			var oCol = _this.getColumn(oModel.getColIndex());;
			var iRowIdx = _this.getRowIndex(oModel.getRow());
			oModel.$innerSetInfo(iRowIdx, oCol);
			if(sPropertyName == KTCell.TREE_EXPANDING)
			{
				syncTreeExpand(oModel);
				return;//单元格的树收展，模型先同步行列的隐藏状态，再另行通知UI更新。。
			}
		}
		_oUI.propertyChangeHandler(oModel, sPropertyName, value, oldValue);
		//如果是反向依赖的话，应该是在UI中，table.addPropertyChangeListener(xx);，然后这里调用add进来的xx。
		//只不过这个类耦合了UI，为降低复杂度，要求UI提供public的propertyChangeHandler接口就行。
	}
	
	//模型结构改变事件处理
	var modelChangeHandler = function(oModel, strType)
	{
		if(_oUI && _oUI.isSyncUIWhenModelChanged())
		{
			_oUI.modelChangeHandler(oModel, strType);
		}
	}
	
	/** 取得选中模型 */
	this.getSelectionModel = function()
	{
		return _oSelectionModel;
	}
	
	/** 标识选中目标的自定义绘制器，参照KTableSelectionRender接口 */
	this.setSelectionRender = function(funSelectionRender)
	{
		_funSelectionRender = funSelectionRender;
	}
	this.getSelectionRender = function()
	{
		return _funSelectionRender;
	}
	
	/** 缺省为true，即鼠标按下即选中的模式；否则要鼠标放开（即click）才选中 */
	this.setMouseDownSelectingMode = function(bMouseDownSelectingMode)
	{
		_bMouseDownSelectingMode = bMouseDownSelectingMode;
	}
	this.isMouseDownSelectingMode = function()
	{
		return _bMouseDownSelectingMode;
	}
	
	//UI鼠标按下事件，处理选中
	var selectHandler = function(strType, oEventWrap)
	{
		if((_bMouseDownSelectingMode && strType != "mousedown")
			|| (!_bMouseDownSelectingMode && strType == "mousedown"))
		{
			return;
		}
		if(!oEventWrap.isCellPointed())
		{
			return;
		}
		var oSelectionModel = _this.getSelectionModel();
		if(oSelectionModel.getMode() == KTSelectionModel.MODE_NONE)
		{
			return;
		}
		var oMouseTarget = oEventWrap.getMouseTargetModel();
		var oSelectedTarget;
		if(oMouseTarget instanceof KTCell.Path)//鼠标点上单元格
		{
			var oPath = oMouseTarget;
			if(oSelectionModel.isPolicySetting(KTSelectionModel.POLICY_ROW))
			{
				if(oPath.getRowIndex() < _this.getFrozenRows())
				{
					return;//行选时，不能选中冻结行表头
				}
				oSelectedTarget = oSelectionModel.createRowTarget(oPath.getRowIndex());
			}
			else if(oSelectionModel.isPolicySetting(KTSelectionModel.POLICY_COLUMN))
			{
				if(oPath.getColIndex() < _this.getFrozenColumns())
				{
					return;//列选时，不能选中冻结列表头
				}
				oSelectedTarget = oSelectionModel.createColumnTarget(oPath.getColIndex());
			}
			else//POLICY_BLOCK or CELL
			{
				oSelectedTarget = oSelectionModel.createCellTarget(oPath.getRowIndex(), oPath.getColIndex());
			}
		}
		else
		{
			return;//TODO 鼠标点上行头列头
		}
		
		if(oEventWrap.isCtrlDown() && oSelectionModel.getMode() == KTSelectionModel.MODE_MULTI)
		{
			if(oSelectionModel.isContains(oSelectedTarget))
			{
				oSelectionModel.removeSelected(oSelectedTarget);
			}
			else
			{
				oSelectionModel.addSelected(oSelectedTarget);
			}
		}
		else if(oEventWrap.isShiftDown() && oSelectionModel.getMode() == KTSelectionModel.MODE_MULTI)
		{
			if(oSelectionModel.isContains(oSelectedTarget))
			{
				oSelectionModel.removeSelected(oSelectedTarget);
			}
			oSelectionModel.appendSelected(oSelectedTarget);
		}
		else
		{
			if(oSelectionModel.hasSelected())
			{
				if(!oSelectionModel.isSingleSelected() || !oSelectionModel.isContains(oSelectedTarget))
				{
					oSelectionModel.removeAllSelecteds();
					oSelectionModel.addSelected(oSelectedTarget);
				}
			}
			else
			{
				oSelectionModel.addSelected(oSelectedTarget);
			}
		}
	}
	
	/** 冻结行数 */
	this.setFrozenRows = function(iFrozenRows)
	{
		if(_iFrozenRows != iFrozenRows)
		{
			var iOldValue = _iFrozenRows;
			_iFrozenRows = iFrozenRows;
			propertyChangeHandler(this, KTableUI.FROZEN_ROW, _iFrozenRows, iOldValue);
		}
	}
	this.getFrozenRows = function()
	{
		return _iFrozenRows;
	}
	
	/** 冻结列数 */
	this.setFrozenColumns = function(iFrozenColumns)
	{
		if(_iFrozenColumns != iFrozenColumns)
		{
			var iOldValue = _iFrozenColumns;
			_iFrozenColumns = iFrozenColumns;
			propertyChangeHandler(this, KTableUI.FROZEN_COL, _iFrozenColumns, iOldValue);
		}
	}
	this.getFrozenColumns = function()
	{
		return _iFrozenColumns;
	}
	
	/**
	 * 弹出菜单
	 * 可在适当的时机（例如CellClick事件中，当按下右键时）调用此接口，使表格上弹出菜单。
	 * @param iX 控件中的横坐标
	 * @param iY 控件中的纵坐标，X/Y可从事件封装对象oEventWrap取到。
	 * @param arrMenuItem 菜单项（KTPopupMenuItem）的数组
	 * @param funAction 响应点击菜单项的回调函数，形如：func(oItem)。
	 * @param oCss 可省略。
	 * 				定制弹出菜单样式，包括背景色、边框色、字号等，KEY用CSS名称；
	 * 				另，鼠标划过的颜色用"selection-color"。
	 */
	this.popupMenu = function(iX, iY, arrMenuItem, funAction, oCss)
	{
		getUiObject().popupMenu(iX, iY, arrMenuItem, funAction, oCss);
	}
	
	//树的收展，同步行列隐藏
	var syncTreeExpand = function(oPath)
	{
//		var t = new Date().getTime();
		var bOriSyncUI;
		if(_oUI)
		{
			//记录原状态并关闭自动同步UI
			bOriSyncUI = _oUI.isSyncUIWhenModelChanged();
			_oUI.setSyncUIWhenModelChanged(false);
		}
		
		var oCell = oPath.getCell();
		var oTreeModel = oCell.getTreeModel();
		var iLoopFrom = (oTreeModel.isHorizontal() ? oPath.getColIndex() + 1 : oPath.getRowIndex() + 1);
		var iLoopTo = (oTreeModel.isHorizontal() ? _this.getColumnsCount() : _this.getRowsCount());
		var iStopLevel = 0x7fff;
		for(var i = iLoopFrom; i < iLoopTo; i++)
		{
			var iNextRowIdx = (oTreeModel.isHorizontal() ? oPath.getRowIndex() : i);
			var iNextColIdx = (oTreeModel.isHorizontal() ? i : oPath.getColIndex());
			var oRow = _this.getRow(iNextRowIdx);
			var oNextCell = oRow.getCell(iNextColIdx);
			var oHideTarget = (oTreeModel.isHorizontal() ? _this.getColumn(iNextColIdx) : oRow);
			if(!oNextCell || !oNextCell.getTreeModel())
			{
				break;
			}
			var oNextTreeModel = oNextCell.getTreeModel();
			if(oNextTreeModel.getLevel() <= oTreeModel.getLevel()
				|| oTreeModel.isHorizontal() != oNextTreeModel.isHorizontal())
			{
				break;
			}
			if(oNextTreeModel.getLevel() <= iStopLevel)
			{
				iStopLevel = 0x7fff;
				if(oTreeModel.isExpanded())
				{
					oHideTarget.setHide(false);
					if(!oNextTreeModel.isExpanded())//遇到收起的子节点，不能再向下展开
					{
						iStopLevel = oNextTreeModel.getLevel()
					}
				}
				else
				{
					oHideTarget.setHide(true);
				}
			}
		}
		
		if(_oUI)
		{
			//打开自动同步UI，并修改模型使触发
			(oTreeModel.isHorizontal() ? oPath.getCol() : oPath.getRow()).setHide(true);
			_oUI.setSyncUIWhenModelChanged(true);
			(oTreeModel.isHorizontal() ? oPath.getCol() : oPath.getRow()).setHide(false);
			//恢复回原状态
			_oUI.setSyncUIWhenModelChanged(bOriSyncUI);
		}
//		$("#txtForOutput").val(new Date().getTime() - t);
	}
	
	/** 按比例调整列宽，使所有列刚好占满界面总宽度 */
	this.isColumnFitVisibleWidth = function()
	{
		return _isColumnFitVisibleWidth;
	}
	this.setColumnFitVisibleWidth = function(isColumnFitVisibleWidth)
	{
		_isColumnFitVisibleWidth = isColumnFitVisibleWidth;
	}
	
	/** 行高自适应 */
	this.isAutoAdjustRowHeight = function()
	{
		return _isAutoAdjustRowHeight;
	}
	this.setAutoAdjustRowHeight = function(isAutoAdjustRowHeight)
	{
		_isAutoAdjustRowHeight = isAutoAdjustRowHeight;
	}
	
	/** 选中指定点的元素，指定点无效则返回false */
	this.selectByPoint = function(iClientX, iClientY)
	{
		return getUiObject().selectByPoint(iClientX, iClientY);
	}
	
	/** 
	 * 设置滚动条是否出现，分水平和垂直二个方向，取值:"hidden"/"auto"/"scroll"。 
	 * 也可以通过第三个参数funCustomSetter传入回调函数作自定义设置，函数形如：func(jqScroller)
	 */
	this.setScrollerVisible = function(sHorizontalValue, sVarticalValue, funCustomSetter)
	{
		getUiObject().setScrollerVisible(sHorizontalValue, sVarticalValue, funCustomSetter);
	}
}
KTable.iFLowId = 0;//用于标识不同表格实例的流水号


/**
 * 弹出菜单项
 */
function KTPopupMenuItem(sText)
{
	var _sText = sText;
	var _oUserObject;
	
	/** 显示文字 */
	this.setText = function(sText)
	{
		_sText = sText;
	}
	this.getText = function()
	{
		return _sText;
	}
	
	/** 用户数据 */
	this.setUserObject = function(oUserObject)
	{
		_oUserObject = oUserObject
	}
	this.getUserObject = function()
	{
		return _oUserObject;
	}
}

/** 
 * 封装鼠标事件的抽象基类 
 */
function KTAbstractMouseEvent(evt, iXMouseAtTable, iYMouseAtTable)
{
	var _oOriginalEvent = evt;
	var _iXMouseAtTable = iXMouseAtTable;
	var _iYMouseAtTable = iYMouseAtTable;

	/** 鼠标相对于表格的X坐标 */
	this.getX = function()
	{
		return _iXMouseAtTable;
	}
	
	/** 鼠标相对于表格的Y坐标 */
	this.getY = function()
	{
		return _iYMouseAtTable;
	}
	
	/** 是否同时按下[Ctrl]键 */
	this.isCtrlDown = function()
	{
		return _oOriginalEvent.ctrlKey;
	}
	
	/** 是否同时按下[Shift]键 */
	this.isShiftDown = function()
	{
		return _oOriginalEvent.shiftKey;
	}
	
	/** 是否按下鼠标左键 */
	this.isLeftButton = function()
	{
		return _oOriginalEvent.which == 1;
	}
	
	/** 是否按下鼠标右键 */
	this.isRightButton = function()
	{
		return _oOriginalEvent.which == 3;
	}
}

/** 
 * 单元格点击事件，
 * table.addCellClickListener()的回调函数的参数 
 */
function KTCellClickEvent(evt, iXMouseAtTable, iYMouseAtTable, oCell, oCol, oRow)
{
	KTAbstractMouseEvent.call(this, evt, iXMouseAtTable, iYMouseAtTable);
	
	var _oCell = oCell;
	var _oCol = oCol;
	var _oRow = oRow;
	
	/** 鼠标点击的目标单元格，注意可能为空 */
	this.getCell = function()
	{
		return _oCell;
	}
	
	this.getCol = function()
	{
		return _oCol;
	}
	
	this.getRow = function()
	{
		return _oRow;
	}
}

/**
 * 树展开/收起事件
 * table.addTreeExpandListener()的回调函数的参数
 */
function KTTreeExpandEvent(oCell, iRowIdx, iColIdx)
{
	var _oCell = oCell;
	var _iRowIdx = iRowIdx;
	var _iColIdx = iColIdx;
	
	/** 是否已展开 */
	this.isExpanded = function()
	{
		return _oCell.getTreeModel().isExpanded();
	}
	
	this.getCell = function()
	{
		return _oCell;
	}
	
	this.getRowIdx = function()
	{
		return _iRowIdx;
	}
	
	this.getColIdx = function()
	{
		return _iColIdx;
	}
}
