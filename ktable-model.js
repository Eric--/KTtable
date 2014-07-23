//
// 金蝶软件（中国）有限公司版权所有.
// 
// Along 创建于 2012-9-21 
//

/**
 * 列模型
 */
function KTColumn(funPropertyChangeListener, strKey)
{
	KTColumn.WIDTH = "width";
	KTColumn.HIDE = "columnHide";
	
	var _this = this;
	var _funPropertyChangeListener = funPropertyChangeListener;
	var _sKey = (strKey ? strKey : "col" + (++KTColumn.iFlowId));
	var _iWidth = 72;
	var _oStyle;
	var _oBorder;
	var _bHide = false;
	
	/** 设置字符串的列标识 */
	this.setKey = function(strKey)
	{
		_sKey = strKey;
	}
	/** 获取字符串的列标识。如果不主动设置，系统会随机生成一个值。 */
	this.getKey = function()
	{
		return _sKey;
	}
	
	/** 设置列宽(整数) */
	this.setWidth = function(iWidth)
	{
		if(_iWidth != iWidth)
		{
			var iOldValue = _iWidth;
			_iWidth = iWidth;
			_funPropertyChangeListener(this, KTColumn.WIDTH, _iWidth, iOldValue);
		}
	}
	/** 获取列宽(整数) */
	this.getWidth = function()
	{
		return _iWidth;
	}
	
	/** 内部接口，销毁对象 */
	this.$innerDestroy = function()
	{
		this.setStyle(null);
		this.setBorder(null);
		_funPropertyChangeListener = null;
	}
	
	/** 设置样式对象 */
	this.setStyle = function(oStyle)
	{
		if(oStyle != _oStyle)
		{
			if(_oStyle != null)
			{
				_oStyle.removeChangeListener(stylePropertyChangeHandler);
			}
			_oStyle = oStyle;
			if(_oStyle != null)
			{
				_oStyle.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取样式对象 */
	this.getStyle = function()
	{
		return _oStyle;
	}
	
	/** 设置边框样式对象 */
	this.setBorder = function(oBorder)
	{
		if(oBorder != _oBorder)
		{
			if(_oBorder != null)
			{
				_oBorder.removeChangeListener(stylePropertyChangeHandler);
			}
			_oBorder = oBorder;
			if(_oBorder != null)
			{
				_oBorder.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取边框样式对象 */
	this.getBorder = function()
	{
		return _oBorder;
	}
	
	//样式对象(包括边框)属性改变事件处理
	var stylePropertyChangeHandler = function(oStyle, sKey, value, oldValue)
	{
		//注意外发时模型对象变成this--列
		_funPropertyChangeListener(_this, sKey, value, oldValue);
	}
	
	/** 是否隐藏 */
	this.setHide = function(bHide)
	{
		if(_bHide != bHide)
		{
			_bHide = bHide;
			_funPropertyChangeListener(_this, KTColumn.HIDE, _bHide, !_bHide);
		}
	}
	this.isHide = function()
	{
		return _bHide;
	}
}
KTColumn.iFlowId = 100;

/**
 * 行模型
 */
function KTRow(iCols, funPropertyChangeListener)
{
	KTRow.HEIGHT = "height";
	KTRow.HIDE = "rowHide";
	
	var _this = this;
	var _funPropertyChangeListener = funPropertyChangeListener;
	var _sKey = "row" + (++KTRow.iFlowId);
	var _iHeight = 20;
	var _arrCells = new Array(iCols);
	var _oStyle;
	var _oBorder;
	var _bHide = false;
	var _oUserObject;
	
	var init = function()
	{
//		for(var i = 0; i < iCols; i++)
//		{
//			_this.$innerInsertCell(-1);
//		}
	}
	
	/** 获取字符串的行标识。内部为了UI与Model建立联系的值，只读。 */
	this.getKey = function()
	{
		return _sKey;
	}
	
	/** 设置行高(整数) */
	this.setHeight = function(iHeight)
	{
		if(_iHeight != iHeight)
		{
			var iOldValue = iHeight;
			_iHeight = iHeight;
			_funPropertyChangeListener(this, KTRow.HEIGHT, _iHeight, iOldValue);
		}
	}
	/** 获取行高(整数) */
	this.getHeight = function()
	{
		return _iHeight;
	}
	
	/** 
	 * 取得指定列序号的单元格模型<br>
	 * 除非参数bMayNull=true，否则总能取到非空对象 
	 */
	this.getCell = function(iIdx, bMayNull)
	{
		var oCell = _arrCells[iIdx];
		if(!bMayNull && !oCell)
		{
			oCell = new KTCell(cellPropertyChangeHandler);
			_arrCells[iIdx] = oCell;
		}
		return oCell;
	}
	
	/** 取得指定列序号的单元格模型，可能为空 */
	this.getCellForDraw = function(iIdx)
	{
		return _arrCells[iIdx];
	}
	
	/** 设置样式对象 */
	this.setStyle = function(oStyle)
	{
		if(oStyle != _oStyle)
		{
			if(_oStyle != null)
			{
				_oStyle.removeChangeListener(stylePropertyChangeHandler);
			}
			_oStyle = oStyle;
			if(_oStyle != null)
			{
				_oStyle.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取样式对象 */
	this.getStyle = function()
	{
		return _oStyle;
	}
	
	/** 设置边框样式对象 */
	this.setBorder = function(oBorder)
	{
		if(oBorder != _oBorder)
		{
			if(_oBorder != null)
			{
				_oBorder.removeChangeListener(stylePropertyChangeHandler);
			}
			_oBorder = oBorder;
			if(_oBorder != null)
			{
				_oBorder.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取边框样式对象 */
	this.getBorder = function()
	{
		return _oBorder;
	}
	
	/** 内部接口，销毁对象 */
	this.$innerDestroy = function()
	{
		this.setStyle(null);
		this.setBorder(null);
		_funPropertyChangeListener = null;
		for(var iColIdx = 0; iColIdx < _arrCells.length; iColIdx++)
		{
			var oCell = _arrCells[iColIdx];
			if(oCell)
			{
				oCell.$innerDestroy();
			}
		}
		_arrCells = null;
	}
	
	/** 内部接口，插入列时给行补单元格 */
	this.$innerInsertCell = function(iIdx)
	{
		_arrCells.splice(iIdx, 0, null);
	}
	
	/** 内部接口，删除列时给行删单元格 */
	this.$innerRemoveCell = function(iIdx)
	{
		var oCell = _arrCells[iIdx];
		if(oCell)
		{
			oCell.$innerDestroy();
		}
		_arrCells.splice(iIdx, 1);
	}
	
	//单元格属性改变事件处理，封装上行对象、列序号再向外发。
	var cellPropertyChangeHandler = function(oCell, strPropertyName, value, oldValue)
	{
		var iColIdx;
		for(iColIdx = 0; iColIdx < _arrCells.length; iColIdx++)
		{
			if(_arrCells[iColIdx] == oCell)
			{
				break;
			}
		}
		var oPath = new KTCell.Path(_this, iColIdx, oCell);
		_funPropertyChangeListener(oPath, strPropertyName, value, oldValue);
	}
	
	//样式对象(包括边框)属性改变事件处理
	var stylePropertyChangeHandler = function(oStyle, sKey, value, oldValue)
	{
		//注意外发时模型对象变成this--行
		_funPropertyChangeListener(_this, sKey, value, oldValue);
	}
	
	/** 是否隐藏 */
	this.setHide = function(bHide)
	{
		if(_bHide != bHide)
		{
			_bHide = bHide;
			_funPropertyChangeListener(_this, KTRow.HIDE, _bHide, !_bHide);
		}
	}
	this.isHide = function()
	{
		return _bHide;
	}
	
	/** 用户自定义数据 */
	this.setUserObject = function(oUserObject)
	{
		_oUserObject = oUserObject;
	}
	this.getUserObject = function()
	{
		return _oUserObject;
	}
	
	init();
}
KTRow.iFlowId = 0;

/**
 * 单元格模型
 */
function KTCell(funPropertyChangeListener)
{
	KTCell.VALUE = "value";
	KTCell.TREE_EXPANDING = "treeExpanding";
	
	var _this = this;
	var _funPropertyChangeListener = funPropertyChangeListener;
	var _oValue;
	var _oStyle;
	var _oBorder;
	var _oTreeModel;
	var _oUserObject;
	
	/** 设置单元格的值 */
	this.setValue = function(oValue)
	{
		if(_oValue != oValue)
		{
			var oOldValue = _oValue;
			_oValue = oValue;
			_funPropertyChangeListener(this, KTCell.VALUE, _oValue, oOldValue);
		}
	}
	/** 获取单元格的值 */
	this.getValue = function()
	{
		return _oValue;
	}
	
	/** 用户自定义数据，预计报表联查的数模型可以存放于此 */
	this.setUserObject = function(oUserObject)
	{
		_oUserObject = oUserObject;
	}
	this.getUserObject = function()
	{
		return _oUserObject;
	}
	
	/** 内部接口，销毁对象 */
	this.$innerDestroy = function()
	{
		this.setStyle(null);
		this.setBorder(null);
		_funPropertyChangeListener = null;
	}
	
	/** 设置样式对象 */
	this.setStyle = function(oStyle)
	{
		if(oStyle != _oStyle)
		{
			if(_oStyle != null)
			{
				_oStyle.removeChangeListener(stylePropertyChangeHandler);
			}
			_oStyle = oStyle;
			if(_oStyle != null)
			{
				_oStyle.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取样式对象 */
	this.getStyle = function()
	{
		return _oStyle;
	}
	
	/** 设置边框样式对象 */
	this.setBorder = function(oBorder)
	{
		if(oBorder != _oBorder)
		{
			if(_oBorder != null)
			{
				_oBorder.removeChangeListener(stylePropertyChangeHandler);
			}
			_oBorder = oBorder;
			if(_oBorder != null)
			{
				_oBorder.addChangeListener(stylePropertyChangeHandler);
			}
		}
	}
	/** 获取边框样式对象 */
	this.getBorder = function()
	{
		return _oBorder;
	}
	
	//样式对象(包括边框)属性改变事件处理
	var stylePropertyChangeHandler = function(oStyle, sKey, value, oldValue)
	{
		//注意外发时模型对象变成this--单元格
		_funPropertyChangeListener(_this, sKey, value, oldValue);
	}
	
	/** 树模型 */
	this.setTreeModel = function(oTreeModel)
	{
		if(_oTreeModel)
		{
			_oTreeModel.$innerBindChangeListener(null);
			//if(oTreeModel == null)//从有到无，即删除，是否同步状态？
		}
		_oTreeModel = oTreeModel;
		if(_oTreeModel)
		{
			_oTreeModel.$innerBindChangeListener(treeModelChangeHandler);
			syncTreeExpandState(_oTreeModel);
		}
	}
	this.getTreeModel = function()
	{
		return _oTreeModel;
	}
	
	//监听树模型属性改变，做状态同步或内部校验
	var treeModelChangeHandler = function(sKey)
	{
		if(sKey == KTCellTreeModel.EXPANDED)
		{
			syncTreeExpandState(_oTreeModel);
		}
	}
	
	var syncTreeExpandState = function(oTreeModel)
	{
		_funPropertyChangeListener(_this, KTCell.TREE_EXPANDING);
	}
	
	/** 描述单元格所在行列的对象，作为发属性改变事件时的数据模型 */
	KTCell.Path = function(oRow, iColIdx, oCell)
	{
		var _iRowIdx;
		var _iColIdx = iColIdx;
		var _oRow = oRow;
		var _oCol;
		var _oCell = oCell;
		
		/** 内部接口，补上行序号和列对象 */
		this.$innerSetInfo = function(iRowIdx, oCol)
		{
			_iRowIdx = iRowIdx;
			_oCol = oCol;
		}
		
		this.getRowIndex = function()
		{
			return _iRowIdx;
		}
		
		this.getColIndex = function()
		{
			return _iColIdx;
		}
		
		this.getRow = function()
		{
			return _oRow;
		}
		
		this.getCol = function()
		{
			return _oCol;
		}
		
		this.getCell = function()
		{
			return _oCell;
		}
	}
}

/**
 * 样式集合的抽象基类
 */
function KTAbstractStyle()
{
	var _strCss = null;
	
	var _arrChangeListeners = [];
	
	this.$innerDirty = function(oModel, strKey, value, oldValue)
	{
		_strCss = null;
		for(var i = 0; i < _arrChangeListeners.length; i++)
		{
			//发事件
			_arrChangeListeners[i](oModel, strKey, value, oldValue);
		}
	}
	
	/** 添加一个事件监听回调函数 */
	this.addChangeListener = function(funChangeListener)
	{
		if(typeof(funChangeListener) != "function")
		{
			throw new Error("Illegal argument.");
		}
		if(checkContainsChangeListener(funChangeListener) < 0)
		{
			_arrChangeListeners.push(funChangeListener);
		}
	}
	
	/** 移除一个事件监听回调函数 */
	this.removeChangeListener = function(funChangeListener)
	{
		var iIndex = checkContainsChangeListener(funChangeListener);
		if(iIndex >= 0)
		{
			_arrChangeListeners.splice(iIndex, 1);
		}
	}
	
	var checkContainsChangeListener = function(funChangeListener)
	{
		for(var i = 0; i < _arrChangeListeners.length; i++)
		{
			if(_arrChangeListeners[i] == funChangeListener)
			{
				return i;
			}
		}
		return -1;
	}
	
	/** 克隆出一个新对象 */
	this.copy = function()
	{
		throw new Error("Override me.");
	}
	
	/** 获取CSS格式的字符串 */
	this.toCssString = function()
	{
		if(_strCss == null)
		{
			_strCss = this.protectedCreateCssString();
		}
		return _strCss;
	}
	
	this.protectedCreateCssString = function()
	{
		throw new Error("Override me.");
	}
	
	KTAbstractStyle.createCssItem = function(strCssKey, oValue, strUnit)
	{
		var strDataType = typeof(oValue);
		if(strDataType == "undefined" || oValue == null)
		{
			return "";
		}
		if(strDataType == "string" && oValue.indexOf(' ') > 0)
		{
			return strCssKey + ':"' + oValue + '";';
		}
		else
		{
			return strCssKey + ':' + oValue + (strUnit ? strUnit : "") + ';';
		}
	}
	
	/** 覆盖toString()方法，对象可作为键，且具有相同属性的对象键相同 */
	this.toString = function()
	{
		return this.toCssString();
	}
}

/**
 * 样式集合对象
 * 不包括边框，边框样式另在KTBorderStyle中定义。
 */
function KTStyle()
{
	KTAbstractStyle.call(this);
	
	KTStyle.STYLE_COMMON = "styleCommon";
	KTStyle.STYLE_TEXT_SPECIAL  = "styleTextSpecial";
	
	KTStyle.CSS_ID_PREFIXE = "style";
	
	var _this = this;
	
	//以下是可以与Java的Style对应的属性:
	var _sFontName;
	var _iFontSize;
	var _bBold;
	var _bItalic;
	var _bUnderLine;
	var _bLineThrough;
	var _sColor;
	var _sBackgroundColor;
	var _sTextAlign;
	var _sVerticalAlign;
	var _bWrapText;
	
	//以下是比Java的Style多的属性:
	var _sCursor;
	
	var dirty = function(strPropertyName)
	{
		_this.$innerDirty(_this, (strPropertyName ? strPropertyName : KTStyle.STYLE_COMMON));
	}
	
	/** 字体名称 */
	this.setFontName = function(sFontName)
	{
		_sFontName = sFontName;
		dirty();
	}
	this.getFontName = function()
	{
		return _sFontName;
	}
	
	/** 字号 */
	this.setFontSize = function(iFontSize)
	{
		_iFontSize = iFontSize;
		dirty();
	}
	this.getFontSize = function()
	{
		return _iFontSize;
	}
	
	/** 粗体 */
	this.setBold = function(bBold)
	{
		_bBold = bBold;
		dirty();
	}
	this.isBold = function()
	{
		return _bBold;
	}
	
	/** 斜体 */
	this.setItalic = function(bItalic)
	{
		_bItalic = bItalic;
		dirty();
	}
	this.getItalic = function()
	{
		return _bItalic;
	}
	
	/** 是否加文字下划线 */
	this.setUnderLine = function(bUnderLine)
	{
		_bUnderLine = bUnderLine;
		dirty();
	}
	this.isUnderLine = function()
	{
		return _bUnderLine;
	}
	
	/** 是否加文字删除线 */
	this.setLineThrough = function(bLineThrough)
	{
		_bLineThrough = bLineThrough;
		dirty();
	}
	this.isLineThrough = function()
	{
		return _bLineThrough;
	}
	
	/** 前景颜色 */
	this.setColor = function(sColor)
	{
		_sColor = sColor;
		dirty();
	}
	this.getColor = function()
	{
		return _sColor;
	}
	
	/** 背景颜色 */
	this.setBackgroundColor = function(sColor)
	{
		_sBackgroundColor = sColor;
		dirty();
	}
	this.getBackgroundColor = function()
	{
		return _sBackgroundColor;
	}
	
	/** 水平对齐 */
	this.setTextAlign = function(sTextAlign)
	{
		_sTextAlign = sTextAlign;
		dirty();
	}
	this.getTextAlign = function()
	{
		return _sTextAlign;
	}
	
	/** 垂直对齐（CSS不起作用，依赖绘制过程处理） */
	this.setVerticalAlign = function(sVerticalAlign)
	{
		_sVerticalAlign = sVerticalAlign;
		dirty(KTStyle.STYLE_TEXT_SPECIAL);
	}
	this.getVerticalAlign = function()
	{
		return _sVerticalAlign;
	}
	
	/** 自动换行（影响垂直居中，绘制过程处理） */
	this.setWrapText = function(bWrapText)
	{
		_bWrapText = bWrapText;
		dirty(KTStyle.STYLE_TEXT_SPECIAL);
	}
	this.isWrapText = function()
	{
		return _bWrapText;
	}
	
	/** 鼠标形状 */
	this.setCursor = function(sCursor)
	{
		_sCursor = sCursor;
	}
	this.getCursor = function()
	{
		return _sCursor;
	}
	
	/** 克隆出一个新对象 */
	this.copy = function()
	{
		var oNew = new KTStyle();
		oNew.setFontName(_sFontName);
		oNew.setFontSize(_iFontSize);
		oNew.setBold(_bBold);
		oNew.setItalic(_bItalic);
		oNew.setUnderLine(_bUnderLine);
		oNew.setLineThrough(_bLineThrough)
		oNew.setColor(_sColor);
		oNew.setBackgroundColor(_sBackgroundColor);
		oNew.setTextAlign(_sTextAlign);
		oNew.setVerticalAlign(_sVerticalAlign);
		oNew.setWrapText(_bWrapText);
		oNew.setCursor(_sCursor);
		return oNew;
	}
	
	this.protectedCreateCssString = function()
	{
		var strCss = "";
		strCss += KTAbstractStyle.createCssItem("font-family", _sFontName);
		strCss += KTAbstractStyle.createCssItem("font-size", _iFontSize, "pt");
		if(_bBold)
		{
			strCss += KTAbstractStyle.createCssItem("font-weight", "bold");
		}
		if(_bItalic)
		{
			strCss += KTAbstractStyle.createCssItem("font-style", "italic");
		}
		if(_bLineThrough && _bUnderLine)
		{
			strCss += KTAbstractStyle.createCssItem("text-decoration", "underline line-through");
		}
		else if(_bUnderLine)
		{
			strCss += KTAbstractStyle.createCssItem("text-decoration", "underline");
		}
		else if(_bLineThrough)
		{
			strCss += KTAbstractStyle.createCssItem("text-decoration", "line-through");
		}
		
		strCss += KTAbstractStyle.createCssItem("color", _sColor);
		strCss += KTAbstractStyle.createCssItem("background-color", _sBackgroundColor);
		strCss += KTAbstractStyle.createCssItem("text-align", _sTextAlign);
		strCss += KTAbstractStyle.createCssItem("vertical-align", _sVerticalAlign);
		if(_bWrapText === true)
		{
			strCss += KTAbstractStyle.createCssItem("white-space", "pre-wrap");
			//pre-wrap值是CSS 2.1才支持，IE6/7需要用下面方式兼容：
			strCss += KTAbstractStyle.createCssItem("*white-space", "pre");
			strCss += KTAbstractStyle.createCssItem("*word-wrap", "break-word");
		}
		else if(_bWrapText === false)
		{
			strCss += KTAbstractStyle.createCssItem("white-space", "nowrap");
		}
		strCss += KTAbstractStyle.createCssItem("cursor", _sCursor);
		return strCss;
	}
}

/**
 * 边框样式集合
 */
function KTBorderStyle()
{
	KTAbstractStyle.call(this);
	
	KTBorderStyle.BORDER_COMMON = "borderCommon";
	KTBorderStyle.BORDER_WIDTH = "borderWidth";
	
	KTBorderStyle.CSS_ID_PREFIXE = "border";
	
	//四个边按CSS的top-right-bottom-left顺时针序
	var _arrBorderPen = new Array(4);
	var _arrBorderWidth = new Array(4);
	var _arrBorderColor = new Array(4);
	
	var _this = this;
	
	var dirty = function(strPropertyName)
	{
		_this.$innerDirty(_this, (strPropertyName ? strPropertyName : KTBorderStyle.BORDER_COMMON));
	}
	
	/** 设置上边框的笔型，值为solid double dashed dotted等 */
	this.setTopBorderPen = function(strBorderPen)
	{
		_arrBorderPen[0] = strBorderPen;
		dirty();
	}
	this.getTopBorderPen = function()
	{
		return _arrBorderPen[0];
	}
	
	/** 设置右边框的笔型，值为solid double dashed dotted等 */
	this.setRightBorderPen = function(strBorderPen)
	{
		_arrBorderPen[1] = strBorderPen;
		dirty();	
	}
	this.getRightBorderPen = function()
	{
		return _arrBorderPen[1];
	}
	
	/** 设置下边框的笔型，值为solid double dashed dotted等 */
	this.setBottomBorderPen = function(strBorderPen)
	{
		_arrBorderPen[2] = strBorderPen;
		dirty();	
	}
	this.getBottomBorderPen = function()
	{
		return _arrBorderPen[2];
	}
	
	/** 设置左边框的笔型，值为solid double dashed dotted等 */
	this.setLeftBorderPen = function(strBorderPen)
	{
		_arrBorderPen[3] = strBorderPen;
		dirty();	
	}
	this.getLeftBorderPen = function()
	{
		return _arrBorderPen[3];
	}
	
	/** 设置四边笔型，值为solid double dashed dotted等 */
	this.setBorderPen = function(strBorderPen)
	{
		for(var i = 0; i < 4; i++)
		{
			_arrBorderPen[i] = strBorderPen;
		}
		dirty();
	}
	this.getBorderPen = function()
	{
		if(_arrBorderPen[0] == _arrBorderPen[1]
			&& _arrBorderPen[0] == _arrBorderPen[2]
			&& _arrBorderPen[0] == _arrBorderPen[3])
		{
			return _arrBorderPen[0];
		}
		return null;
	}
	
	/** 设置上边框的线宽，值为整数(单位px) */
	this.setTopBorderWidth = function(iWidth)
	{
		_arrBorderWidth[0] = iWidth;
		dirty(KTBorderStyle.BORDER_WIDTH);
	}
	this.getTopBorderWidth = function()
	{
		return _arrBorderWidth[0];
	}
	
	/** 设置右边框的线宽，值为整数(单位px) */
	this.setRightBorderWidth = function(iWidth)
	{
		_arrBorderWidth[1] = iWidth;
		dirty(KTBorderStyle.BORDER_WIDTH);
	}
	this.getRightBorderWidth = function()
	{
		return _arrBorderWidth[1];
	}
	
	/** 设置下边框的线宽，值为整数(单位px) */
	this.setBottomBorderWidth = function(iWidth)
	{
		_arrBorderWidth[2] = iWidth;
		dirty(KTBorderStyle.BORDER_WIDTH);
	}
	this.getBottomBorderWidth = function()
	{
		return _arrBorderWidth[2];
	}
	
	/** 设置左边框的线宽，值为整数(单位px) */
	this.setLeftBorderWidth = function(iWidth)
	{
		_arrBorderWidth[3] = iWidth;
		dirty(KTBorderStyle.BORDER_WIDTH);
	}
	this.getLeftBorderWidth = function()
	{
		return _arrBorderWidth[3];
	}
	
	/** 设置四边的线宽，值为整数(单位px) */
	this.setBorderWidth = function(iWidth)
	{
		for(var i = 0; i < 4; i++)
		{
			_arrBorderWidth[i] = iWidth;
		}
		dirty(KTBorderStyle.BORDER_WIDTH);
	}
	this.getBorderWidth = function()
	{
		if(_arrBorderWidth[0] == _arrBorderWidth[1]
			&& _arrBorderWidth[0] == _arrBorderWidth[2]
			&& _arrBorderWidth[0] == _arrBorderWidth[3])
		{
			return _arrBorderWidth[0];
		}
		return null;
	}

	/** 设置上边框的颜色 */
	this.setTopBorderColor = function(strColor)
	{
		_arrBorderColor[0] = strColor;
		dirty();
	}
	this.getTopBorderColor = function()
	{
		return _arrBorderColor[0];
	}
	
	/** 设置右边框的颜色 */
	this.setRightBorderColor = function(strColor)
	{
		_arrBorderColor[1] = strColor;
		dirty();
	}
	this.getRightBorderColor = function()
	{
		return _arrBorderColor[1];
	}
	
	/** 设置下边框的颜色 */
	this.setBottomBorderColor = function(strColor)
	{
		_arrBorderColor[2] = strColor;
		dirty();
	}
	this.getBottomBorderColor = function()
	{
		return _arrBorderColor[2];
	}
	
	/** 设置左边框的颜色 */
	this.setLeftBorderColor = function(strColor)
	{
		_arrBorderColor[3] = strColor;
		dirty();
	}
	this.getLeftBorderColor = function()
	{
		return _arrBorderColor[3];
	}
	
	/** 设置四边的颜色 */
	this.setBorderColor = function(strColor)
	{
		for(var i = 0; i < 4; i++)
		{
			_arrBorderColor[i] = strColor;
		}
		dirty();
	}
	this.getBorderColor = function()
	{
		if(_arrBorderColor[0] == _arrBorderColor[1]
			&& _arrBorderColor[0] == _arrBorderColor[2]
			&& _arrBorderColor[0] == _arrBorderColor[3])
		{
			return _arrBorderColor[0];
		}
		return null;
	}
	
	/** 克隆出一个新对象 */
	this.copy = function()
	{
		var oNew = new KTBorderStyle();
		
		oNew.setTopBorderPen(this.getTopBorderPen());
		oNew.setRightBorderPen(this.getRightBorderPen());
		oNew.setBottomBorderPen(this.getBottomBorderPen());
		oNew.setLeftBorderPen(this.getLeftBorderPen());
		
		oNew.setTopBorderWidth(this.getTopBorderWidth());
		oNew.setRightBorderWidth(this.getRightBorderWidth());
		oNew.setBottomBorderWidth(this.getBottomBorderWidth());
		oNew.setLeftBorderWidth(this.getLeftBorderWidth());
		
		oNew.setTopBorderColor(this.getTopBorderColor());
		oNew.setRightBorderColor(this.getRightBorderColor());
		oNew.setBottomBorderColor(this.getBottomBorderColor());
		oNew.setLeftBorderColor(this.getLeftBorderColor());
		
		return oNew;
	}
	
	this.protectedCreateCssString = function()
	{
		var strCss = "";
		var strBorderPen = this.getBorderPen();
		if(strBorderPen == null)
		{
			strCss += KTAbstractStyle.createCssItem("border-top-style", this.getTopBorderPen());
			strCss += KTAbstractStyle.createCssItem("border-right-style", this.getRightBorderPen());
			strCss += KTAbstractStyle.createCssItem("border-bottom-style", this.getBottomBorderPen());
			strCss += KTAbstractStyle.createCssItem("border-left-style", this.getLeftBorderPen());
		}
		else
		{
			strCss += KTAbstractStyle.createCssItem("border-style", strBorderPen);
		}
		
		var iBorderWidth = this.getBorderWidth();
		if(iBorderWidth == null)
		{
			strCss += KTAbstractStyle.createCssItem("border-top-width", this.getTopBorderWidth(), "px");
			strCss += KTAbstractStyle.createCssItem("border-right-width", this.getRightBorderWidth(), "px");
			strCss += KTAbstractStyle.createCssItem("border-bottom-width", this.getBottomBorderWidth(), "px");
			strCss += KTAbstractStyle.createCssItem("border-left-width", this.getLeftBorderWidth(), "px");
		}
		else
		{
			strCss += KTAbstractStyle.createCssItem("border-width", iBorderWidth, "px");
		}
		
		var strBorderColor = this.getBorderColor();
		if(strBorderColor == null)
		{
			strCss += KTAbstractStyle.createCssItem("border-top-color", this.getTopBorderColor());
			strCss += KTAbstractStyle.createCssItem("border-right-color", this.getRightBorderColor());
			strCss += KTAbstractStyle.createCssItem("border-bottom-color", this.getBottomBorderColor());
			strCss += KTAbstractStyle.createCssItem("border-left-color", this.getLeftBorderColor());
		}
		else
		{
			strCss += KTAbstractStyle.createCssItem("border-color", strBorderColor);
		}
		return strCss;
	}
}

/**
 * 共享Style对象
 * 包括KTStyle和KTBorderStyle
 */
function KTStyleManager()
{
	//每个map为key:oStyle.toString() -> value:[oStyle, strId]
	var _oMaps = new KTStyleManager.MultiMaps();
	
	var createStyleId = function(oStyle)
	{
		//不同类型的样式集合指定各自的名称前缀以示区别。当更新UI对象的clsss属性时可以只清除并重建相应部分。
		var strPrefix;
		if(oStyle instanceof KTStyle)
		{
			strPrefix = KTStyle.CSS_ID_PREFIXE;
		}
		else if(oStyle instanceof KTBorderStyle)
		{
			strPrefix = KTBorderStyle.CSS_ID_PREFIXE;
		}
		else
		{
			throw new Error("New type, modify here.");
		}
		return strPrefix + (++KTStyleManager.iStyleFlowId);
	}
	
	var getShareInfo = function(oStyle, iPriority)
	{
		var map = _oMaps.getMap(iPriority);
		var arrInfo = map[oStyle];
		if(!arrInfo)
		{
			var strId = createStyleId(oStyle);
			var arrInfo = [oStyle, strId];
			map[oStyle] = arrInfo;
		}
		return arrInfo;
	}
	
	/**
	 * 取得已存在的、属性一模一样的样式对象；如果没有已存在的，返回的就是它自己。
	 * 注意：如果要对返回值进行写操作，而不影响其它所有者，应该用.copy()克隆出新的实例。
	 */
	this.getShareStyle = function(oStyle, iPriority)
	{
		return getShareInfo(oStyle, iPriority)[0];
	}
	
	/**
	 * 取得已存在的、属性一模一样的样式对象的ID；如果没有已存在的，则会创建一个新ID。
	 */
	this.getShareStyleId = function(oStyle, iPriority)
	{
		return getShareInfo(oStyle, iPriority)[1];
	}
}
KTStyleManager.iStyleFlowId = 0;//创建ID的流水号，同一页面可以有多个表格实例，必须为静态变量。

KTStyleManager.PRIORITY_TABLE = 0;
KTStyleManager.PRIORITY_ROW = 1;
KTStyleManager.PRIORITY_COLUMN = 2;
KTStyleManager.PRIORITY_CELL = 3;

KTStyleManager.MultiMaps = function()
{
	//以priority为index，值为map的数组。
	var _arrForMap = [];
	
	this.getMap = function(iPriority)
	{
		var map = _arrForMap[iPriority];
		if(!map)
		{
			map = {};
			_arrForMap[iPriority] = map;
		}
		return map;
	}
}

/**
 * 记录选中信息的数据模型
 */
function KTSelectionModel(oTable)
{
	/** 不允许选中 */
	KTSelectionModel.MODE_NONE = "selection_mode_none";
	/** 单选模式 */
	KTSelectionModel.MODE_SINGLE = "selection_mode_single";
	/** 多选模式 */
	KTSelectionModel.MODE_MULTI = "selection_mode_multi";
	
	/** 选中策略-单元格 */
	KTSelectionModel.POLICY_CELL = 0x01;
	/** 选中策略-块（矩形区域的单元格集合） */
	KTSelectionModel.POLICY_BLOCK = 0x02;
	/** 选中策略-整行 */
	KTSelectionModel.POLICY_ROW = 0x04;
	/** 选中策略-整列 */
	KTSelectionModel.POLICY_COLUMN = 0x08;
	
	/** 选中改变事件--添加 */
	KTSelectionModel.CHANGE_ADD = "selectionChange-add";
	/** 选中改变事件--删除 */
	KTSelectionModel.CHANGE_REMOVE = "selectionChange-remove";
	
	var _oTable = oTable;
	var _this = this;
	
	var _strMode = KTSelectionModel.MODE_NONE;
	var _iPolicy = KTSelectionModel.POLICY_CELL;
	
	var _arrSelecteds = [];
	
	var _listenerProxy = new KTListenerProxy();
	
	/** 选中模式，参照常量MODE_XXX */
	this.setMode = function(strMode)
	{
		_strMode = strMode;
	}
	this.getMode = function()
	{
		return _strMode;
	}
	
	/** 选中策略，参照常量POLICY_XXX */
	this.setPolicy = function(iPolicy)
	{
		_iPolicy = iPolicy;
	}
	this.getPolicy = function()
	{
		return _iPolicy;
	}
	/** 选中策略可以多项同时指定，如POLICY_XX | POLICY_YY。该接口用于判断iPolicy是否已设置。 */
	this.isPolicySetting = function(iPolicy)
	{
		return (_iPolicy & iPolicy) == iPolicy;
	}
	
	/** 
	 * 添加选中改变事件
	 * 回调函数形如：func(strType, arrTargets)，其中strType为常量CHANGE_ADD或CHANGE_REMOVE
	 */
	this.addChangeListener = function(funListener)
	{
		_listenerProxy.addListener(KTSelectionModel.CHANGE_ADD, funListener);
		_listenerProxy.addListener(KTSelectionModel.CHANGE_REMOVE, funListener);
	}
	
	/** 移除选中改变事件监听 */
	this.removeChangeListener = function(funListener)
	{
		_listenerProxy.removeListener(KTSelectionModel.CHANGE_ADD, funListener);
		_listenerProxy.removeListener(KTSelectionModel.CHANGE_REMOVE, funListener);
	}
	
	//发事件
	var fireChangeListener = function(strType, arrTargets)
	{
		_listenerProxy.fireListener(strType, arrTargets);
	}
	
	/** 添加一个选中 */
	this.addSelected = function(oTarget)
	{
		if(!(oTarget instanceof KTSelectionModel.Target))
		{
			throw new Error("Illegal argument.");
		}
		_arrSelecteds.push(oTarget);
		fireChangeListener(KTSelectionModel.CHANGE_ADD, [oTarget]);
	}
	
	/**
	 * 服务于[Shift]+选中
	 * 参数oTarget为当次选中的独立目标，该方法会把它和上一次的目标合并成块（或多行或多列）。
	 */
	this.appendSelected = function(oTarget)
	{
		if(!(oTarget instanceof KTSelectionModel.Target))
		{
			throw new Error("Illegal argument.");
		}
		if(!this.hasSelected())
		{
			_this.addSelected(oTarget);
			return;
		}
		var oLastTarget = this.getSelected();
		var arrRange = _this.parseBlockRange(oTarget);
		var arrLastRange = _this.parseBlockRange(oLastTarget);
		
		var iRowIdx1 = Math.min(Math.min(Math.min(arrRange[0], arrRange[2]), arrLastRange[0]), arrLastRange[2]);
		var iColIdx1 = Math.min(Math.min(Math.min(arrRange[1], arrRange[3]), arrLastRange[1]), arrLastRange[3]);
		var iRowIdx2 = Math.max(Math.max(Math.max(arrRange[0], arrRange[2]), arrLastRange[0]), arrLastRange[2]);
		var iColIdx2 = Math.max(Math.max(Math.max(arrRange[1], arrRange[3]), arrLastRange[1]), arrLastRange[3]);
		
		var oMergedTarget;
		if(oTarget.isSingleRow())
		{
			oMergedTarget = createRowsTarget(iRowIdx1, iRowIdx2);
		}
		else if(oTarget.isSingleColumn())
		{
			oMergedTarget = createColumnsTarget(iColIdx1, iColIdx2);
		}
		else//oTarget.isSingleCell()
		{
			if(_this.isPolicySetting(KTSelectionModel.POLICY_BLOCK))
			{
				oMergedTarget = _this.createBlockTarget(iRowIdx1, iColIdx1, iRowIdx2, iColIdx2);
			}
			else
			{
				for(var i = iRowIdx1; i <= iRowIdx2; i++)
				{
					for(var j = iColIdx1; j <= iColIdx2; j++)
					{
						var oCellTarget = _this.createCellTarget(i, j);
						if(!_this.isContains(oCellTarget))
						{
							_this.addSelected(oCellTarget);
						}
					}
				}
				return;
			}
		}
		_this.removeSelected(oLastTarget);
		_this.addSelected(oMergedTarget);
	}
	
	/** 移除一个选中 */
	this.removeSelected = function(oTarget)
	{
		for(var i = _arrSelecteds.length - 1; i >= 0; i--)
		{
			var oTemp = _arrSelecteds[i];
			if(oTemp.equals(oTarget))
			{
				_arrSelecteds.splice(i, 1);
				fireChangeListener(KTSelectionModel.CHANGE_REMOVE, [oTemp]);
				return true;
			}
		}
		return false;
	}
	
	/** 移除所有选中 */
	this.removeAllSelecteds = function()
	{
		var arrOld = _arrSelecteds.slice(0);
		_arrSelecteds = [];
		fireChangeListener(KTSelectionModel.CHANGE_REMOVE, arrOld);
	}
	
	this.setSelected = function(oTarget)
	{
		if(this.hasSelected())
		{
			this.removeAllSelecteds();
		}
		this.addSelected(oTarget);
	}
	
	/** 取得所有选中信息 */
	this.getSelecteds = function()
	{
		return _arrSelecteds.concat();
	}
	
	/** 取得最近一个选中 */
	this.getSelected = function()
	{
		return this.hasSelected() ? _arrSelecteds[_arrSelecteds.length - 1] : null;
	}
	
	/** 是否有选中 */
	this.hasSelected = function()
	{
		return _arrSelecteds.length > 0;
	}
	
	/** 是否单选中 */
	this.isSingleSelected = function()
	{
		return _arrSelecteds.length == 1;
	}
	
	/** 是否已包含指定的选中信息 */
	this.isContains = function(oTarget)
	{
		for(var i = 0; i < _arrSelecteds.length; i++)
		{
			if(_arrSelecteds[i].equals(oTarget))
			{
				return true;
			}
		}
		return false;
	}
	
	/**
	 * 创建一个单元格选中目标KTSelectionModel.Target，
	 * 注意得到的对象不一定是isSingleCell()，如果落在融合块中，则isBlock()。
	 */
	this.createCellTarget = function(iRowIdx, iColIdx)
	{
		var arrMergeBlocks = _oTable.getMergeBlocks();
		for(var i = 0; i < arrMergeBlocks.length; i++)
		{
			var oMergeBlock = arrMergeBlocks[i];
			if(iRowIdx >= oMergeBlock.getRowIdxFrom() && iRowIdx <= oMergeBlock.getRowIdxTo()
				&& iColIdx >= oMergeBlock.getColIdxFrom() && iColIdx <= oMergeBlock.getColIdxTo())
			{
				return new KTSelectionModel.Target(oMergeBlock.getRowIdxFrom(), 
					oMergeBlock.getColIdxFrom(), oMergeBlock.getRowIdxTo(), oMergeBlock.getColIdxTo());
			}
		}
		return new KTSelectionModel.Target(iRowIdx, iColIdx);
	}
	
	/** 创建一个isSingleRow()的选中目标KTSelectionModel.Target */
	this.createRowTarget = function(iRowIdx)
	{
		return KTSelectionModel.Target.createRow(iRowIdx, -1); 
	}
	
	/** 创建一个isSingleColumn()的选中目标KTSelectionModel.Target */
	this.createColumnTarget = function(iColIdx)
	{
		return KTSelectionModel.Target.createColumn(-1, iColIdx);
	}
	
	/**
	 * 创建一个块的选中目标KTSelectionModel.Target，
	 * 注意4个参数如果行列相等（退化成一个单元格），则得到的对象是isSingleCell()。
	 */
	this.createBlockTarget = function(iRowIdx1, iColIdx1, iRowIdx2, iColIdx2)
	{
		if(iRowIdx1 == iRowIdx2 && iColIdx1 == iColIdx2)
		{
			return _this.createCellTarget(iRowIdx1, iColIdx1);
		}
		var iRowIdx = Math.min(iRowIdx1, iRowIdx2);
		var iEndRowIdx = Math.max(iRowIdx1, iRowIdx2);
		var iColIdx = Math.min(iColIdx1, iColIdx2);
		var iEndColIdx = Math.max(iColIdx1, iColIdx2);
		return new KTSelectionModel.Target(iRowIdx, iColIdx, iEndRowIdx, iEndColIdx);
	}
	
	var createRowsTarget = function(iRowIdx1, iRowIdx2)
	{
		if(iRowIdx1 == iRowIdx2)
		{
			return _this.createRowTarget(iRowIdx1);
		}
		var iRowIdx = Math.min(iRowIdx1, iRowIdx2);
		var iEndRowIdx = Math.max(iRowIdx1, iRowIdx2);
		return new KTSelectionModel.Target(iRowIdx, -1, iEndRowIdx);
	}
	
	var createColumnsTarget = function(iColIdx1, iColIdx2)
	{
		if(iColIdx1 == iColIdx2)
		{
			return _this.createColumnTarget(iColIdx1);
		}
		var iColIdx = Math.min(iColIdx1, iColIdx2);
		var iEndColIdx = Math.max(iColIdx1, iColIdx2);
		return new KTSelectionModel.Target(-1, iColIdx, null, iEndColIdx);
	}
	
	/**
	 * @return 与表格实际行列对应的、4个值都有意义的[iRowIdx, iColIdx, iEndRowIdx, iEndColIdx]
	 * 例如第N行M列[N, M, N, M]
	 * 例如第一行整行[1, 0, 1, columnsCount-1]
	 */
	this.parseBlockRange = function(oTarget)
	{
		var iRowIdx = oTarget.getRowIdx();
		var iColIdx = oTarget.getColIdx();
		var iEndRowIdx = oTarget.getEndRowIdx();
		var iEndColIdx = oTarget.getEndColIdx();
		if(oTarget.isSingleCell())
		{
			iEndRowIdx = iRowIdx;
			iEndColIdx = iColIdx;
		}
		else if(oTarget.isSingleRow() || oTarget.isRows())
		{
			if(oTarget.isSingleRow())
			{
				iEndRowIdx = iRowIdx;
			}
			iColIdx = 0;
			iEndColIdx = _oTable.getColumnsCount() - 1;
		}
		else if(oTarget.isSingleColumn() || oTarget.isColumns())
		{
			if(oTarget.isSingleColumn())
			{
				iEndColIdx = iColIdx;
			}
			iRowIdx = 0;
			iEndRowIdx = _oTable.getRowsCount() - 1;
		}//else default is blocks
		return [iRowIdx, iColIdx, iEndRowIdx, iEndColIdx];
	}
}

/**
 * 描述选中目标的数据模型
 * 不要直接实例化，通过SelectionModel的createXxx创建。
 * iRowIdx或iColIdx为-1表示整列或整行；iEndXX为null表示忽略。isSingleCell()等接口可以判断。
 */
KTSelectionModel.Target = function(iRowIdx, iColIdx, iEndRowIdx, iEndColIdx)
{
	var _iRowIdx = iRowIdx;
	var _iColIdx = iColIdx;
	var _iEndRowIdx = (iEndRowIdx || iEndRowIdx == 0 ? iEndRowIdx : null);
	var _iEndColIdx = (iEndColIdx || iEndColIdx == 0 ? iEndColIdx : null);
	
	/** 取得选中目标的行序号 */
	this.getRowIdx = function()
	{
		return _iRowIdx;
	}
	
	/** 取得选中目标的列序号 */
	this.getColIdx = function()
	{
		return _iColIdx;
	}
	
	/** 如果跨多行，这是结束行序号 */
	this.getEndRowIdx = function()
	{
		return _iEndRowIdx;
	}
	
	/** 如果跨多列，这是结束列序号 */
	this.getEndColIdx = function()
	{
		return _iEndColIdx;
	}

	this.equals = function(oOther)
	{
		return (this.getRowIdx() == oOther.getRowIdx() 
			&& this.getColIdx() == oOther.getColIdx() 
			&& this.getEndRowIdx() == oOther.getEndRowIdx() 
			&& this.getEndColIdx() == oOther.getEndColIdx());
	}
	
	this.toString = function()
	{
		return _iRowIdx + "," + _iColIdx + "~" + _iEndRowIdx + "," + _iEndColIdx;
	}
	
	/** 是否单选单元格 */
	this.isSingleCell = function()
	{
		return (_iEndRowIdx == null) && (_iEndColIdx == null) && (_iRowIdx != -1) && (_iColIdx != -1);
	}
	
	/** 是否单行 */
	this.isSingleRow = function()
	{
		return (_iEndRowIdx == null) && (_iColIdx == -1);
	}
	
	/** 是否单列 */
	this.isSingleColumn = function()
	{
		return (_iRowIdx == -1) && (_iEndColIdx == null);
	}
	
	/** 是否矩形块 */
	this.isBlock = function()
	{
		return (_iEndRowIdx != null) && (_iRowIdx != -1) 
			&& (_iEndColIdx != null) && (_iColIdx != -1);
	}
	
	/** 是否多行 */
	this.isRows = function()
	{
		return (_iEndRowIdx != null) && (_iEndRowIdx != _iRowIdx) && (_iColIdx == -1);
	}
	
	/** 是否多列 */
	this.isColumns = function()
	{
		return (_iRowIdx == -1) && (_iEndColIdx != null) && (_iEndColIdx != _iColIdx);
	}
}

KTSelectionModel.Target.createRow = function(iRowIdx)
{
	return new KTSelectionModel.Target(iRowIdx, -1); 
}

KTSelectionModel.Target.createColumn = function(iColIdx)
{
	return new KTSelectionModel.Target(-1, iColIdx);
}

/**
 * 融合块模型
 */
function KTMergeBlock(iRowIdxFrom, iRowIdxTo, iColIdxFrom, iColIdxTo)
{
	var _iRowIdxFrom = iRowIdxFrom;
	var _iRowIdxTo = iRowIdxTo;
	var _iColIdxFrom = iColIdxFrom;
	var _iColIdxTo = iColIdxTo;
	
	this.setRowIdxFrom = function(iRowIdxFrom)
	{
		_iRowIdxFrom = iRowIdxFrom;
	}
	this.getRowIdxFrom = function()
	{
		return _iRowIdxFrom;
	}
	
	this.setRowIdxTo = function(iRowIdxTo)
	{
		_iRowIdxTo = iRowIdxTo;
	}
	this.getRowIdxTo = function()
	{
		return _iRowIdxTo;
	}
	
	this.setColIdxFrom = function(iColIdxFrom)
	{
		_iColIdxFrom = iColIdxFrom;
	}
	this.getColIdxFrom = function()
	{
		return _iColIdxFrom;
	}
	
	this.setColIdxTo = function(iColIdxTo)
	{
		_iColIdxTo = iColIdxTo;
	}
	this.getColIdxTo = function()
	{
		return _iColIdxTo;
	}
	
	/** 是否为无效的融合块 */
	this.isInvalid = function()
	{
		return _iRowIdxFrom > iRowIdxTo || iColIdxFrom > iColIdxTo || 
				(_iRowIdxFrom == iRowIdxTo && _iColIdxFrom == iColIdxTo);
	}
	
	this.equals = function(oMergeBlock)
	{
		if(oMergeBlock instanceof KTMergeBlock)
		{
			return oMergeBlock.getRowIdxFrom() == _iRowIdxFrom 
				&& oMergeBlock.getRowIdxTo() == _iRowIdxTo
				&& oMergeBlock.getColIdxFrom() == _iColIdxFrom
				&& oMergeBlock.getColIdxTo() == _iColIdxTo;
		}
		return false;
	}
	
	/** @param 分别为单元格的行列值 */
	this.isContainCell = function(iRowIdx, iColIdx)
	{
		return iRowIdx >= _iRowIdxFrom && iRowIdx <= _iRowIdxTo &&
					iColIdx >= _iColIdxFrom && iColIdx <= _iColIdxTo;
	}
}

/**
 * 事件监听器代理类
 * 支持多种事件，每种事件可添加多个监听
 */
function KTListenerProxy()
{
	var _mapListeners = {};//键为事件类型，值为存放事件监听（回调函数）的数组
	
	/**
	 * 添加事件监听
	 * @param strType 事件类型 
	 * @param funListener 形如：func(strType, oEventWrap)
	 */
	this.addListener = function(strType, funListener)
	{
		var arrListeners = _mapListeners[strType];
		if(!arrListeners)
		{
			arrListeners = [];
			_mapListeners[strType] = arrListeners;
		}
		for(var i = 0; i < arrListeners.length; i++)
		{
			if(arrListeners[i] == funListener)
			{
				return;
			}
		}
		arrListeners.push(funListener);
	}
	
	/**
	 * 移除事件监听
	 */
	this.removeListener = function(strType, funListener)
	{
		var arrListeners = _mapListeners[strType];
		if(arrListeners)
		{
			for(var i = arrListeners.length - 1; i >= 0; i--)
			{
				if(arrListeners[i] == funListener)
				{
					arrListeners.splice(i, 1);
					break;
				}
			}
		}
	}
	
	/** 发事件 */
	this.fireListener = function(strType, oEventWrap)
	{
		var arrListeners = _mapListeners[strType];
		if(arrListeners)
		{
			for(var i = arrListeners.length - 1; i >= 0; i--)
			{
				arrListeners[i](strType, oEventWrap);
			}
		}
	}
}

/**
 * 嵌入对象（悬浮于表格之上）
 */
function KTEmbedObject(sId, iX, iY, iWidth, iHeight)
{
	KTEmbedObject.BOUND = "embedObjectXYWH";
	KTEmbedObject.DATA = "embedObjectData";
	
//	KTEmbedObject.AUTO_ADJUST_NONE = 0;//不受表格影响
//	KTEmbedObject.AUTO_ADJUST_POSITION = 1;//位置随表格动
//	KTEmbedObject.AUTO_ADJUST_BOTH = 2;//位置大小都随表格动
	
	var _this = this;
	
	var _funPropertyChangeListener;
	
	var _sId = sId;
	
	var _iX = iX;
	var _iY = iY;
	var _iWidth = iWidth;
	var _iHeight = iHeight;
	
	var _sType;
	var _oUserObject;
	
//	var _iAutoAdjustPolicy;//TODO
	
	/** 内部接口 */
	this.$innerBindChangeListener = function(funcListener)
	{
		_funPropertyChangeListener = funcListener;
	}
	
	var fireChangeEvent = function(sKey, value, oldValue)
	{
		if(_funPropertyChangeListener)
		{
			_funPropertyChangeListener(_this, sKey, value, oldValue);
		}
	}
	
	/** 嵌入对象的名称，必须是唯一标识 */
	this.setId = function(sId)
	{
		_sId = sId;
	}
	this.getId = function()
	{
		return _sId;
	}
	
	/** X坐标 */
	this.setX = function(iX)
	{
		if(_iX != iX)
		{
			_iX = iX;
			fireChangeEvent(KTEmbedObject.BOUND);
		}
	}
	this.getX = function()
	{
		return _iX;
	}
	
	/** Y坐标 */
	this.setY = function(iY)
	{
		if(_iY != iY)
		{
			_iY = iY;
			fireChangeEvent(KTEmbedObject.BOUND);
		}
	}
	this.getY = function()
	{
		return _iY;
	}
	
	/** 宽度 */
	this.setWidth = function(iWidth)
	{
		if(_iWidth != iWidth)
		{
			_iWidth = iWidth;
			fireChangeEvent(KTEmbedObject.BOUND);
		}
	}
	this.getWidth = function()
	{
		return _iWidth;
	}
	
	/** 高度 */
	this.setHeight = function(iHeight)
	{
		if(_iHeight != iHeight)
		{
			_iHeight = iHeight;
			fireChangeEvent(KTEmbedObject.BOUND);
		}
	}
	this.getHeight = function()
	{
		return _iHeight;
	}
	
	/** 调用者自定义的类型标识。例如可以用"img"表示图片；用"chart"表示统计图表。 */
	this.setType = function(sType)
	{
		_sType = sType;
	}
	this.getType = function()
	{
		return _sType;
	}
	
	/** 调用者自定义的数据，通常会与type对应。 */
	this.setUserObject = function(oUserObject)
	{
		var oOld = _oUserObject;
		_oUserObject = oUserObject;
		fireChangeEvent(KTEmbedObject.DATA, _oUserObject, oOld);
	}
	this.getUserObject = function()
	{
		return _oUserObject;
	}
}

/**
 * 单元格上的树模型
 */
function KTCellTreeModel(iLevel, bHorizontal)
{
	KTCellTreeModel.EXPANDED = "expanded";
	
	var _funPropertyChangeListener;
	
	var _bHorizontal = (bHorizontal ? true : false);
	var _iLevel = iLevel;
	var _bHaveHandler = false;
	var _bExpanded = true;
	
	/** 内部接口 */
	this.$innerBindChangeListener = function(funcListener)
	{
		_funPropertyChangeListener = funcListener;
	}
	
	var fireChangeEvent = function(sKey)
	{
		if(_funPropertyChangeListener)
		{
			_funPropertyChangeListener(sKey);
		}
	}
	
	/** 横向，否则为纵向。应该使全树(不同单元格的树模型)一致。 */
//	this.setHorizontal = function(bHorizontal)
//	{
//		_bHorizontal = bHorizontal;
//	}
	this.isHorizontal = function()
	{
		return _bHorizontal;
	}
	
	/** 层级，从0开始，0是1的父... */
//	this.setLevel = function(iLevel)
//	{
//		_iLevel = iLevel;
//	}
	this.getLevel = function()
	{
		return _iLevel;
	}
	
	/** 如果指定该属性为true，则没有子节点也会出现收、展(-/+)操作符，以便于做数据懒加载。 */
	this.setHaveHandlerAlways = function(bHaveHandler)
	{
		_bHaveHandler = bHaveHandler;
	}
	this.isHaveHandlerAlways = function()
	{
		return _bHaveHandler;
	}
	
	/** 处于展开状态，否则为收起状态 */
	this.setExpanded = function(bExpanded)
	{
		if(_bExpanded != bExpanded)
		{
			_bExpanded = bExpanded;
			fireChangeEvent(KTCellTreeModel.EXPANDED);
		}
	}
	this.isExpanded = function()
	{
		return _bExpanded;
	}
}

/**
 * 斜线表头的数据模型
 * 可以作为单元格的Value
 * <p>
 * 表头跨crossRows行、crossColumns列。
 * 连线总是从一个角作为基点(basePoint)出发，连向对角及对角的两条边。
 * 对角的两条边，隔linkToRows[k]行（总是从上到下）、隔linkToColumns[k]列（总是从左到右）有一个连接点。
 * e.g. crossRows=6; linkToRows=[1,3]; 
 *   则共有6行，第一个三角型指向第1行，第二个三角型指向后续3行，剩2行是第三个三角型（对角总是有连线）。
 * <br>
 * 三角型的索引号是以基点为中心顺时针排序。每个三角型上可以设置文字及绘制相关属性。
 */
function KTDiagonalModel()
{
	KTDiagonalModel.BASE_LEFT_UP = "left-up";
	KTDiagonalModel.BASE_RIGHT_UP = "right-up";
	KTDiagonalModel.BASE_LEFT_DOWN = "left-down";
	KTDiagonalModel.BASE_RIGHT_DOWN = "right-down";
	
	var _sBasePoint = KTDiagonalModel.BASE_LEFT_UP;
	var _iCrossRows = 1;
	var _iCrossCols = 1;
	var _arrLinkToRows = [];
	var _arrLinkToCols = [];
	var _arrTriangles = [];
	
	/** 基点位置 */
	this.setBasePoint = function(sBasePoint)
	{
		_sBasePoint = sBasePoint;
	}
	this.getBasePoint = function()
	{
		return _sBasePoint;
	}
	
	/** 表头单元格(也许是融合块)跨多少行 */
	this.setCrossRows = function(iCrossRows)
	{
		_iCrossRows = iCrossRows;
	}
	this.getCrossRows = function()
	{
		return _iCrossRows;
	}
	
	/** 表头单元格(也许是融合块)跨多少列 */
	this.setCrossColumns = function(iCrossCols)
	{
		_iCrossCols = iCrossCols;
	}
	this.getCrossColumns = function()
	{
		return _iCrossCols;
	}
	
	/** 对角边隔几行一个连线点 */
	this.setLinkToRows = function(arrLinkToRows)
	{
		_arrLinkToRows = arrLinkToRows;
	}
	this.getLinkToRows = function()
	{
		return _arrLinkToRows;
	}
	
	/** 对角边隔几列一个连线点 */
	this.setLinkToColumns = function(arrLinkToCols)
	{
		_arrLinkToCols = arrLinkToCols;
	}
	this.getLinkToColumns = function()
	{
		return _arrLinkToCols;
	}
	
	/** 取得三角型个数 */
	this.getTriangleSize = function()
	{
		return _arrLinkToRows.length + _arrLinkToCols.length + 2;
	}
	
	var getTriangle = function(iIndex)
	{
		var oTriangle = _arrTriangles[iIndex];
		if(!oTriangle)
		{
			oTriangle = {"text":"", "lean":true};
			_arrTriangles[iIndex] = oTriangle;
		}
		return oTriangle;
	}
	
	/** 第iIndex个三角型的文字 */
	this.setText = function(sText, iIndex)
	{
		getTriangle(iIndex)["text"] = sText;
	}
	this.getText = function(iIndex)
	{
		return getTriangle(iIndex)["text"];
	}
	
	/** 第iIndex个三角型是否倾斜绘制文字 */
	this.setLean = function(bLean, iIndex)
	{
		getTriangle(iIndex)["lean"] = bLean;
	}
	this.isLean = function(iIndex)
	{
		return getTriangle(iIndex)["lean"];
	}
}