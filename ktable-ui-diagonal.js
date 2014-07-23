//
// 金蝶软件（中国）有限公司版权所有.
// 
// Along 创建于 2012-12-19 
//

// import ktable-model.js
// import ktable.js

//TODO 仅处理基点位于左上的情况，如果要支持其它三种情形，凡注明“基点相关”的地方都要修改。

/**
 * 斜线表头绘制器
 */
function KTDiagonalRender()
{
	/**
	 * 创建一个HTML5的Canvas对象
	 * 按oDiagonalModel模型的描述，绘制出斜线及文字
	 */
	this.createCanvas = function(oTable, oDiagonalModel, iRowIdx, iColIdx, iHeaderWidth, iHeaderHeight)
	{
		try
		{
			var htmlCanvas = document.createElement("canvas");
			htmlCanvas.width = iHeaderWidth;
			htmlCanvas.height = iHeaderHeight;
			
			var arrY = calculateKeyPointsOfY(oTable, oDiagonalModel, iRowIdx, iHeaderHeight);
			var arrX = calculateKeyPointsOfX(oTable, oDiagonalModel, iColIdx, iHeaderWidth);
			var g2d = htmlCanvas.getContext("2d");

			paintLine(g2d, arrX, arrY, oTable, iRowIdx, iColIdx);

			var arrTriangles = pickTriangles(arrX, arrY);
			for(var i = 0; i < arrTriangles.length; i++)
			{
				var oTriangle = arrTriangles[i];
				var oWeightPoint = getWeightPoint(oTriangle);
				var numRotate = getRotate(oWeightPoint);
				var sText = oDiagonalModel.getText(i);
				g2d.save();
				if(oDiagonalModel.isLean(i))
				{
					paintTextLean(g2d, sText, oWeightPoint, numRotate);
				}
				else
				{
					paintText(g2d, sText, oWeightPoint, numRotate);
				}
				g2d.restore();
			}
			return htmlCanvas;
		}
		catch(ex)
		{
			//alert(ex);
			//此为高级功能，不考虑不支持HTML5的浏览器
			return null;
		}
	}
	
	//纵向边连线点在Y轴上的坐标，相对于表头区域，与基点位置无关
	var calculateKeyPointsOfY = function(oTable, oDiagonalModel, iRowIdx, iHeaderHeight)
	{
		var arrLinkToRows = oDiagonalModel.getLinkToRows();
		var iY = 0;
		var arrY = new Array(arrLinkToRows.length + 2);
		arrY[0] = iY;
		for(var k = 0; k < arrLinkToRows.length; k++)
		{
			for(var i = 0; i < arrLinkToRows[k]; i++)//arrLinkToRows的语义是“隔多少行”
			{
				iY += oTable.getRow(iRowIdx++).getHeight();
			}
			arrY[k + 1] = iY;
		}
		arrY[arrLinkToRows.length + 1] = iHeaderHeight;
		return arrY;
	}
	
	//横向边连线点在X轴上的坐标，相对于表头区域，与基点位置无关
	var calculateKeyPointsOfX = function(oTable, oDiagonalModel, iColIdx, iHeaderWidth)
	{
		var arrLinkToCols = oDiagonalModel.getLinkToColumns();
		var iX = 0;
		var arrX = new Array(arrLinkToCols.length + 2);
		arrX[0] = iX;
		for(var k = 0; k < arrLinkToCols.length; k++)
		{
			for(var i = 0; i < arrLinkToCols[k]; i++)//arrLinkToCols的语义是“隔多少列”
			{
				iX += oTable.getColumn(iColIdx++).getWidth();
			}
			arrX[k + 1] = iX;
		}
		arrX[arrLinkToCols.length + 1] = iHeaderWidth;
		return arrX;
	}
	
	//画斜线，基点相关
	var paintLine = function(g2d, arrX, arrY, oTable, iRowIdx, iColIdx)
	{
		var oRow = oTable.getRow(iRowIdx);
		var oCol = oTable.getColumn(iColIdx);
		var oCell = oRow.getCell(iColIdx);
		var sColor = oTable.getStyleValue(oCell, oCol, oRow, "getBorder", "getRightBorderColor", "#aaaaaa");
		
		g2d.save();
		g2d.strokeStyle = sColor;
		g2d.lineWidth = 0.8;
		var iMaxX = arrX[arrX.length - 1];
		var iMaxY = arrY[arrY.length - 1];
		for(var i = 1; i < arrY.length; i++)
		{
			g2d.moveTo(0,0);
			g2d.lineTo(iMaxX, arrY[i]);
		}
		for(var i = 1; i < arrX.length; i++)
		{
			g2d.moveTo(0,0);
			g2d.lineTo(arrX[i], iMaxY);
		}
		g2d.stroke();
		g2d.restore();
	}
	
	//提取三角型顶点，基点相关
	var pickTriangles = function(arrX, arrY)
	{
		//多个三角型的数组 -> 三个顶点的数组 -> xy坐标的数组
		//[[[x1,y1], [x2,y2], [x3,y3]], [[x1,y1], [x2,y2], [x3,y3]], ...]
		var arrTriangles = [];
		var iMaxX = arrX[arrX.length - 1];
		var iMaxY = arrY[arrY.length - 1];
		var oBasePoint = [0, 0];
		for(var i = 0; i < arrY.length - 1; i++)
		{
			var oPointA = [iMaxX, arrY[i]];
			var oPointB = [iMaxX, arrY[i + 1]];
			arrTriangles.push([oBasePoint, oPointA, oPointB]);
		}
		for(var i = arrX.length - 1; i > 0; i--)
		{
			var oPointA = [arrX[i], iMaxY];
			var oPointB = [arrX[i - 1], iMaxY];
			arrTriangles.push([oBasePoint, oPointA, oPointB]);
		}
		return arrTriangles;
	}
	
	//计算重心，基点位置无关
	var getWeightPoint = function(oTriangle)
	{
		var iX = Math.floor((oTriangle[0][0] + oTriangle[1][0] + oTriangle[2][0]) / 3 + 0.5);
		var iY = Math.floor((oTriangle[0][1] + oTriangle[1][1] + oTriangle[2][1]) / 3 + 0.5);
		return [iX, iY];
	}
	
	//旋转弧度，[-PI/2, PI/2]，符合Canvas约束的弧度值，基点相关
	var getRotate = function(oWeightPoint)
	{
		var oBasePoint = [0, 0];
		var iDeltaX = oWeightPoint[0] - oBasePoint[0];
		if(iDeltaX == 0)
		{
			return PI / 2;
		}
		var iDeltaY = oWeightPoint[1] - oBasePoint[1];
		var numRotate = Math.atan(iDeltaY / iDeltaX);
		return numRotate;
	}
	
	var ADJUST_RANGE =
	[
		[Math.PI / 18, 0.1],//10度以下
		[Math.PI / 12, 0.2],//15度以下
		[Math.PI / 9,  0.3],//20度以下
		[Math.PI / 6,  0.4],//30度以下
		[Math.PI / 2,  0.5]
	];

	var ADJUST_RANGE_FOR_LEAN = 
	[
		[Math.PI / 9,  0.2],//20度以下
		[Math.PI / 6,  0.3],//30度以下
		[Math.PI / 5,  0.4],//36度以下
		[Math.PI / 4,  0.6],//45度以下
		[Math.PI / 2,  0.7],
	];
		
	//计算从中点回退“字符串半个宽度”，与旋转无关
	var getStartOffsetFromCenterPoint = function(g2d, sText, isLean, numRotate)
	{
		var arrAdjust = isLean ? ADJUST_RANGE_FOR_LEAN : ADJUST_RANGE;
		var numRotateAbs = Math.abs(numRotate);
		var numAdjustRate = 0.5;
		for(var i = 0; i < arrAdjust.length; i++)
		{
			if(numRotateAbs <= arrAdjust[i][0])
			{
				numAdjustRate = arrAdjust[i][1];
				break;
			}
		}
		var oMetrics = g2d.measureText(sText);
		var numOffsetX = -oMetrics.width * numAdjustRate;
		
		oMetrics = g2d.measureText("壹");//用于算高度
		var numOffsetY = oMetrics.width * 0.5;
		
		return [numOffsetX, numOffsetY];
	}
	
	//以oCenterPoint为中点，单行绘制sText，基点位置无关
	var paintText = function(g2d, sText, oCenterPoint, numRotate)
	{
		var oOffset = getStartOffsetFromCenterPoint(g2d, sText, false, numRotate);
		var numX = oCenterPoint[0] + oOffset[0]; 
		var numY = oCenterPoint[1] + oOffset[1];
		g2d.fillText(sText, numX, numY);
	}
	
	//以oCenterPoint为中点，numRotate为倾角，绘制sText，基点相关
	var paintTextLean = function(g2d, sText, oCenterPoint, numRotate)
	{
		var bAllAsciiChar = true;
		for(var i = 0; i < sText.length; i++)
		{
			if(sText.charCodeAt(i) > 127)
			{
				bAllAsciiChar = false;
				break;
			}
		}
		
		//起点移到绘制目标中点，旋转角度
		var iCenterX = oCenterPoint[0];
		var iCenterY = oCenterPoint[1];
		g2d.translate(iCenterX, iCenterY);
		g2d.rotate(numRotate);
		
		//起点移回“字符串半个宽度”即绘制目标起点
		var oOffset = getStartOffsetFromCenterPoint(g2d, sText, true, numRotate);
		g2d.translate(oOffset[0], oOffset[1]);
		
		if(bAllAsciiChar)
		{
			//纯英文倾斜绘制，字符都是斜的
			g2d.fillText(sText, 0, 0);
		}
		else
		{
			//转回角度，正向画一个字符；再旋转角度，前进一个字符宽度...
			var iWidthStep = 0;
			for(var i = 0; i < sText.length; i++)
			{
				var cOneChar = sText.charAt(i);
				g2d.translate(iWidthStep, 0);
				g2d.rotate(-numRotate);
				g2d.fillText(cOneChar, 0, 0);
				g2d.rotate(numRotate);
	
				oMetrics = g2d.measureText(cOneChar);
				iWidthStep = oMetrics.width;
			}
		}
	}
}